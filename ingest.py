"""
ingest.py — Daily cron entry point.

Usage:
    python ingest.py                       # uses yesterday (default cron mode)
    python ingest.py --date 20260909       # backfill a specific date
    python ingest.py --local --date 20260909  # skip SFTP, use already-extracted CSVs

Zip filename pattern: {PARENT_BU}_{BRAND}_deliverability_{YYYYMMDD}.zip
  e.g. GTF_CARVEL_deliverability_20260909.zip → parent_bu=GTF, brand=CARVEL

Schedule (crontab example):
    0 6 * * * /usr/bin/python3 /path/to/ingest.py >> /var/log/gtf_ingest.log 2>&1
"""

import sys
import os
import json
import argparse
import traceback
import subprocess
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

sys.path.insert(0, os.path.dirname(__file__))

from sftp_zip_parser import SftpZipParser
from config import SFTP, LOCAL
import db
from db import ENV

ANALYTICS_DIR = os.path.join(os.path.dirname(__file__), '..', 'analytics')
DATA_JSON     = os.path.join(ANALYTICS_DIR, 'data.json')

ALERT_TO   = 'vinodkumar.senrayar@epsilon.com'
#ALERT_TO   = 'ic-edm@epsilon.com'
ALERT_FROM = 'noreply-gtf-ingest@epsilon.com'
SENDMAIL   = '/usr/sbin/sendmail'


# Domains whose emails are filtered out before any insertion or metric computation.
# Add any test/seed domains here.
TEST_DOMAINS = {
    'mailtrap.io',
    'mailinator.com',
    'guerrillamail.com',
    'yopmail.com',
    'sharklasers.com',
    'trashmail.com',
}


def _email_domain(email: str) -> str:
    return email.split('@')[-1].lower() if '@' in email else ''


def is_test_email(email: str) -> bool:
    """Return True if the email belongs to a known test domain."""
    domain = _email_domain(email)
    # exact match
    if domain in TEST_DOMAINS:
        return True
    # suffix match — catches subdomains like inbox.mailtrap.io
    return any(domain.endswith('.' + d) for d in TEST_DOMAINS)


def filter_test_emails(data: dict) -> Tuple[dict, int]:
    """
    Remove test emails from all event lists in-place.
    Returns cleaned data dict and total number of rows dropped.
    """
    dropped = 0
    for key in ('Sent', 'Opens', 'Clicks', 'Bounces', 'Unsubs', 'NotSent'):
        original = data.get(key, [])
        cleaned  = [r for r in original if not is_test_email(r.get('email', ''))]
        dropped += len(original) - len(cleaned)
        data[key] = cleaned
    return data, dropped


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--date',  help='Date to ingest YYYYMMDD (default: yesterday)')
    p.add_argument('--local', action='store_true', help='Skip SFTP, use already-extracted CSVs')
    p.add_argument('--brand', help='Run only this brand, e.g. --brand CARVEL')
    return p.parse_args()


BRANDS_JSON = os.path.join(os.path.dirname(__file__), 'brands.json')


def load_brands() -> List[dict]:
    """Load brand list from brands.json. Add new entries there to onboard more clients."""
    with open(BRANDS_JSON) as f:
        return json.load(f)


def build_sftp_config(parent_bu: str, brand: str, date_str: str) -> dict:
    cfg = dict(SFTP)
    cfg['remote_path'] = f"{SFTP['remote_dir']}/{parent_bu}_{brand}_deliverability_{date_str}.zip"
    return cfg


def build_send_date_map(sent_rows: List[dict], fallback_date: str) -> Dict[str, str]:
    """
    Build {send_id: send_date} from Sent.csv rows.
    send_date is the DATE part of event_date (YYYY-MM-DD).
    Falls back to fallback_date if event_date is missing.
    """
    mapping = {}
    for r in sent_rows:
        sid = r.get('send_id', '')
        if not sid or sid in mapping:
            continue
        event_date = r.get('event_date', '')
        if event_date and len(event_date) >= 10:
            mapping[sid] = event_date[:10]
        else:
            mapping[sid] = fallback_date
    return mapping


def compute_metrics(data: dict, send_date_map: Dict[str, str], fallback_date: str, parent_bu: str, brand: str) -> List[dict]:
    sent_rows   = data.get('Sent', [])
    open_rows   = data.get('Opens', [])
    click_rows  = data.get('Clicks', [])
    bounce_rows = data.get('Bounces', [])
    unsub_rows  = data.get('Unsubs', [])
    not_sent    = data.get('NotSent', [])

    send_ids = {r['send_id'] for r in sent_rows}
    summaries = []

    for sid in send_ids:
        report_date   = send_date_map.get(sid, fallback_date)
        sent          = sum(1 for r in sent_rows   if r['send_id'] == sid)
        total_opens   = sum(1 for r in open_rows   if r['send_id'] == sid)
        unique_opens  = sum(1 for r in open_rows   if r['send_id'] == sid and r.get('is_unique', '').lower() == 'true')
        total_clicks  = sum(1 for r in click_rows  if r['send_id'] == sid)
        unique_clicks = sum(1 for r in click_rows  if r['send_id'] == sid and r.get('is_unique', '').lower() == 'true')
        bounces       = sum(1 for r in bounce_rows if r['send_id'] == sid)
        hard_bounces  = sum(1 for r in bounce_rows if r['send_id'] == sid and 'hard' in r.get('bounce_category', '').lower())
        unsubs        = sum(1 for r in unsub_rows  if r['send_id'] == sid)
        ns            = sum(1 for r in not_sent    if r['send_id'] == sid)

        open_rate   = round(unique_opens  / sent * 100, 2) if sent else 0
        click_rate  = round(unique_clicks / sent * 100, 2) if sent else 0
        bounce_rate = round(bounces       / sent * 100, 2) if sent else 0
        unsub_rate  = round(unsubs        / sent * 100, 2) if sent else 0

        summaries.append({
            'parent_bu':     parent_bu,
            'brand':         brand,
            'report_date':   report_date,
            'send_id':       sid,
            'sent':          sent,
            'unique_opens':  unique_opens,
            'total_opens':   total_opens,
            'unique_clicks': unique_clicks,
            'total_clicks':  total_clicks,
            'bounces':       bounces,
            'hard_bounces':  hard_bounces,
            'unsubs':        unsubs,
            'not_sent':      ns,
            'open_rate':     open_rate,
            'click_rate':    click_rate,
            'bounce_rate':   bounce_rate,
            'unsub_rate':    unsub_rate,
            'ingested_at':   datetime.now().isoformat(),
        })
    return summaries


# Maps MTA_Networks.Network values → display buckets for the dashboard
DISPLAY_NETWORK = {
    'Google':    'Google',
    'Yahoo':     'Yahoo',
    'Microsoft': 'Hotmail',
    'iCloud':    'iCloud',
    'Cloudmark': 'Comcast',
}


def compute_network_summary(data: dict, send_date_map: Dict[str, str], fallback_date: str, parent_bu: str, brand: str) -> List[dict]:
    """
    Group unique events per email address by network, per send_id.
    report_date is resolved from send_date_map so late-arriving events
    are attributed to the actual send date.
    """
    from collections import defaultdict
    network_map = db.load_mta_networks()

    def get_network(email: str) -> str:
        domain = email.split('@')[-1].lower() if '@' in email else ''
        raw = network_map.get(domain, 'Other')
        return DISPLAY_NETWORK.get(raw, 'Other')

    sent_rows   = data.get('Sent', [])
    bounce_rows = data.get('Bounces', [])
    open_rows   = data.get('Opens', [])
    click_rows  = data.get('Clicks', [])
    unsub_rows  = data.get('Unsubs', [])

    send_ids = {r['send_id'] for r in sent_rows}
    all_rows = []

    for sid in send_ids:
        report_date = send_date_map.get(sid, fallback_date)

        sid_sent    = [r for r in sent_rows   if r['send_id'] == sid]
        sid_bounce  = [r for r in bounce_rows if r['send_id'] == sid]
        sid_opens   = [r for r in open_rows   if r['send_id'] == sid]
        sid_clicks  = [r for r in click_rows  if r['send_id'] == sid]
        sid_unsubs  = [r for r in unsub_rows  if r['send_id'] == sid]

        sent_emails   = {r['email'] for r in sid_sent}
        bounce_emails = {r['email'] for r in sid_bounce}
        open_emails   = {r['email'] for r in sid_opens  if r.get('is_unique', '').lower() == 'true'}
        click_emails  = {r['email'] for r in sid_clicks if r.get('is_unique', '').lower() == 'true'}
        unsub_emails  = {r['email'] for r in sid_unsubs}

        networks: Dict[str, dict] = defaultdict(lambda: {
            'sent': set(), 'bounced': set(), 'opened': set(),
            'clicked': set(), 'unsubbed': set()
        })

        for email in sent_emails:
            networks[get_network(email)]['sent'].add(email)
        for email in bounce_emails:
            networks[get_network(email)]['bounced'].add(email)
        for email in open_emails:
            networks[get_network(email)]['opened'].add(email)
        for email in click_emails:
            networks[get_network(email)]['clicked'].add(email)
        for email in unsub_emails:
            networks[get_network(email)]['unsubbed'].add(email)

        for network, counts in sorted(networks.items()):
            sent          = len(counts['sent'])
            bounces       = len(counts['bounced'])
            delivered     = sent - bounces
            unique_opens  = len(counts['opened'])
            unique_clicks = len(counts['clicked'])
            unsubs        = len(counts['unsubbed'])

            deliv_rate  = round(delivered     / sent * 100, 1) if sent else 0
            open_rate   = round(unique_opens  / delivered * 100, 1) if delivered else 0
            click_rate  = round(unique_clicks / delivered * 100, 1) if delivered else 0
            unsub_rate  = round(unsubs        / delivered * 100, 1) if delivered else 0
            nca_denom   = unsubs + unique_clicks
            nca_rate    = round(unsubs / nca_denom * 100, 1) if nca_denom else 0

            all_rows.append({
                'report_date':   report_date,
                'network':       network,
                'sent':          sent,
                'delivered':     delivered,
                'bounces':       bounces,
                'unique_opens':  unique_opens,
                'unique_clicks': unique_clicks,
                'unsubs':        unsubs,
                'deliv_rate':    deliv_rate,
                'open_rate':     open_rate,
                'click_rate':    click_rate,
                'unsub_rate':    unsub_rate,
                'nca_rate':      nca_rate,
            })
    return all_rows


def compute_top_urls(data: dict, send_date_map: Dict[str, str], fallback_date: str, parent_bu: str, brand: str) -> List[dict]:
    click_rows = data.get('Clicks', [])
    by_url = {}
    for r in click_rows:
        key = (r['send_id'], r['url'])
        if key not in by_url:
            by_url[key] = {'clicks': 0, 'unique_clicks': 0}
        by_url[key]['clicks'] += 1
        if r.get('is_unique', '').lower() == 'true':
            by_url[key]['unique_clicks'] += 1

    return [
        {'parent_bu': parent_bu, 'brand': brand,
         'report_date': send_date_map.get(sid, fallback_date),
         'send_id': sid, 'url': url, 'clicks': v['clicks'], 'unique_clicks': v['unique_clicks']}
        for (sid, url), v in by_url.items()
    ]


def export_data_json(parent_bu: str, brand: str):
    """Rebuild data.json from DB for the dashboard to consume."""
    history = db.fetch_summary_history(days=30, parent_bu=parent_bu, brand=brand)

    existing = {}
    if os.path.exists(DATA_JSON):
        with open(DATA_JSON) as f:
            existing = json.load(f)

    dates        = [r['report_date'] for r in history]
    sent_vals    = [r['sent']          for r in history]
    open_vals    = [r['unique_opens']  for r in history]
    click_vals   = [r['unique_clicks'] for r in history]
    bounce_vals  = [r['bounces']       for r in history]
    unsub_vals   = [r['unsubs']        for r in history]
    open_rates   = [r['open_rate']     for r in history]
    click_rates  = [r['click_rate']    for r in history]
    bounce_rates = [r['bounce_rate']   for r in history]
    unsub_rates  = [r['unsub_rate']    for r in history]

    latest_date = dates[-1] if dates else ''
    top_urls    = db.fetch_top_urls(latest_date, limit=10, parent_bu=parent_bu, brand=brand)
    lists       = db.fetch_lists(latest_date, parent_bu=parent_bu, brand=brand)
    clients     = db.fetch_clients()
    network_summary = db.fetch_network_summary(latest_date, parent_bu=parent_bu, brand=brand)
    latest      = history[-1] if history else {}

    payload = {
        **existing,
        'lastUpdated':   datetime.now().isoformat(),
        'latestDate':    latest_date,
        'activeParentBu': parent_bu,
        'activeBrand':    brand,
        'clients':        clients,
        'kpis': {
            'sent':         latest.get('sent', 0),
            'uniqueOpens':  latest.get('unique_opens', 0),
            'uniqueClicks': latest.get('unique_clicks', 0),
            'bounces':      latest.get('bounces', 0),
            'unsubs':       latest.get('unsubs', 0),
            'openRate':     latest.get('open_rate', 0),
            'clickRate':    latest.get('click_rate', 0),
            'bounceRate':   latest.get('bounce_rate', 0),
            'unsubRate':    latest.get('unsub_rate', 0),
        },
        'deliverabilityTrend': {
            'dates':        dates,
            'sent':         sent_vals,
            'uniqueOpens':  open_vals,
            'uniqueClicks': click_vals,
            'bounces':      bounce_vals,
            'unsubs':       unsub_vals,
        },
        'ratesTrend': {
            'dates':       dates,
            'openRate':    open_rates,
            'clickRate':   click_rates,
            'bounceRate':  bounce_rates,
            'unsubRate':   unsub_rates,
        },
        'topUrls':        top_urls,
        'lists':          lists,
        'networkSummary': network_summary,
    }

    with open(DATA_JSON, 'w') as f:
        json.dump(payload, f, indent=2)

    print(f"  Exported data.json → {DATA_JSON}")


# ─────────────────────────────────────────────────────────────────────────────
# EMAIL ALERTS
# ─────────────────────────────────────────────────────────────────────────────

def _send_email(subject: str, html_body: str) -> None:
    """Send HTML email via sendmail binary — same as PHP mail()."""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = ALERT_FROM
        msg['To']      = ALERT_TO
        msg.attach(MIMEText(html_body, 'html'))

        proc = subprocess.Popen(
            [SENDMAIL, '-t', '-i'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        _, stderr = proc.communicate(msg.as_bytes())
        if proc.returncode == 0:
            print(f"  Email sent → {ALERT_TO}")
        else:
            print(f"  [WARN] sendmail exited {proc.returncode}: {stderr.decode().strip()}")
    except Exception as e:
        print(f"  [WARN] Email failed: {e}")


def send_missing_email(report_date: str, parent_bu: str, brand: str, zip_filename: str) -> None:
    html = f"""
<!DOCTYPE html>
<html>
<head>
<style>
  body    {{ font-family: Arial, sans-serif; font-size: 14px; color: #333; }}
  h2      {{ color: #e65100; }}
  .meta   {{ background: #fff8e1; border-left: 4px solid #ffa000;
             padding: 12px 16px; border-radius: 4px; margin: 16px 0; }}
  .footer {{ margin-top: 24px; font-size: 11px; color: #999; }}
</style>
</head>
<body>
  <h2>&#9888; GTF Ingest — File Not Found on SFTP — {report_date}</h2>
  <div class="meta">
    <strong>Brand:</strong> {parent_bu} / {brand}<br>
    <strong>Date:</strong> {report_date}<br>
    <strong>Expected file:</strong> {zip_filename}<br>
    <strong>SFTP directory:</strong> {SFTP['remote_dir']}<br>
    <strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
  </div>
  <p>The zip file was not present on the SFTP server at the expected path.<br>
     Please verify the file has been delivered by Marketing Cloud for this date.</p>
  <div class="footer">
    GTF Deliverability Ingest &bull; {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} &bull; Server: {os.uname().nodename}
  </div>
</body>
</html>"""
    _send_email(
        subject=f"[GTF Ingest] ⚠️ File Missing — {parent_bu}/{brand} {report_date}",
        html_body=html,
    )


def send_success_email(report_date: str, parent_bu: str, brand: str,
                       zip_filename: str, net_rows: List[dict], summaries: List[dict],
                       data: dict, dropped: int) -> None:

    sent_total   = sum(s['sent']          for s in summaries)
    opens_total  = sum(s['unique_opens']  for s in summaries)
    clicks_total = sum(s['unique_clicks'] for s in summaries)
    bounce_total = sum(s['bounces']       for s in summaries)
    unsub_total  = sum(s['unsubs']        for s in summaries)

    open_rate   = round(opens_total  / sent_total * 100, 2) if sent_total else 0
    click_rate  = round(clicks_total / sent_total * 100, 2) if sent_total else 0
    bounce_rate = round(bounce_total / sent_total * 100, 2) if sent_total else 0
    unsub_rate  = round(unsub_total  / sent_total * 100, 2) if sent_total else 0

    # Network summary table rows
    net_rows_html = ''
    for n in net_rows:
        net_rows_html += f"""
        <tr>
          <td>{n['network']}</td>
          <td>{n['sent']:,}</td>
          <td>{n['delivered']:,}</td>
          <td>{n['bounces']:,}</td>
          <td>{n['unique_opens']:,}</td>
          <td>{n['unique_clicks']:,}</td>
          <td>{n['unsubs']:,}</td>
          <td>{n['deliv_rate']}%</td>
          <td>{n['open_rate']}%</td>
          <td>{n['click_rate']}%</td>
          <td>{n['unsub_rate']}%</td>
          <td>{n['nca_rate']}%</td>
        </tr>"""

    if not net_rows_html:
        net_rows_html = '<tr><td colspan="12" style="text-align:center;color:#888">No network data for this date</td></tr>'

    html = f"""
<!DOCTYPE html>
<html>
<head>
<style>
  body      {{ font-family: Arial, sans-serif; font-size: 14px; color: #333; }}
  h2        {{ color: #2e7d32; }}
  .kpi-grid {{ display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0; }}
  .kpi      {{ background: #f5f5f5; border-left: 4px solid #2e7d32;
               padding: 12px 20px; border-radius: 4px; min-width: 120px; }}
  .kpi .val {{ font-size: 22px; font-weight: bold; color: #2e7d32; }}
  .kpi .lbl {{ font-size: 11px; color: #666; margin-top: 2px; }}
  table     {{ border-collapse: collapse; width: 100%; margin-top: 16px; font-size: 13px; }}
  th        {{ background: #2e7d32; color: #fff; padding: 8px 10px; text-align: left; }}
  td        {{ padding: 7px 10px; border-bottom: 1px solid #e0e0e0; }}
  tr:hover  {{ background: #f9f9f9; }}
  .footer   {{ margin-top: 24px; font-size: 11px; color: #999; }}
</style>
</head>
<body>
  <h2>&#10003; GTF Ingest Success — {report_date}</h2>
  <p><strong>Brand:</strong> {parent_bu} / {brand} &nbsp;&nbsp;
     <strong>File:</strong> {zip_filename} &nbsp;&nbsp;
     <strong>Ingested at:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>

  <div class="kpi-grid">
    <div class="kpi"><div class="val">{sent_total:,}</div><div class="lbl">Sent</div></div>
    <div class="kpi"><div class="val">{opens_total:,}</div><div class="lbl">Unique Opens</div></div>
    <div class="kpi"><div class="val">{clicks_total:,}</div><div class="lbl">Unique Clicks</div></div>
    <div class="kpi"><div class="val">{bounce_total:,}</div><div class="lbl">Bounces</div></div>
    <div class="kpi"><div class="val">{unsub_total:,}</div><div class="lbl">Unsubs</div></div>
    <div class="kpi"><div class="val">{open_rate}%</div><div class="lbl">Open Rate</div></div>
    <div class="kpi"><div class="val">{click_rate}%</div><div class="lbl">Click Rate</div></div>
    <div class="kpi"><div class="val">{bounce_rate}%</div><div class="lbl">Bounce Rate</div></div>
    <div class="kpi"><div class="val">{unsub_rate}%</div><div class="lbl">Unsub Rate</div></div>
    <div class="kpi"><div class="val">{dropped:,}</div><div class="lbl">Test Rows Filtered</div></div>
  </div>

  <h3>Network Summary</h3>
  <table>
    <thead>
      <tr>
        <th>Network</th><th>Sent</th><th>Delivered</th><th>Bounces</th>
        <th>Unique Opens</th><th>Unique Clicks</th><th>Unsubs</th>
        <th>Deliv%</th><th>Open%</th><th>Click%</th><th>Unsub%</th><th>NCA%</th>
      </tr>
    </thead>
    <tbody>{net_rows_html}</tbody>
  </table>

  <div class="footer">
    GTF Deliverability Ingest &bull; {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} &bull; Server: {os.uname().nodename}
  </div>
</body>
</html>"""

    _send_email(
        subject=f"[GTF Ingest] ✅ Success — {parent_bu}/{brand} {report_date} ({zip_filename})",
        html_body=html,
    )


def send_error_email(report_date: str, parent_bu: str, brand: str,
                     error: Exception, tb: str) -> None:

    html = f"""
<!DOCTYPE html>
<html>
<head>
<style>
  body    {{ font-family: Arial, sans-serif; font-size: 14px; color: #333; }}
  h2      {{ color: #c62828; }}
  .meta   {{ background: #fff3e0; border-left: 4px solid #e65100;
             padding: 12px 16px; border-radius: 4px; margin: 16px 0; }}
  .tb     {{ background: #212121; color: #ef9a9a; font-family: monospace;
             font-size: 12px; padding: 16px; border-radius: 4px;
             white-space: pre-wrap; word-break: break-all; }}
  .footer {{ margin-top: 24px; font-size: 11px; color: #999; }}
</style>
</head>
<body>
  <h2>&#10007; GTF Ingest FAILED — {report_date}</h2>

  <div class="meta">
    <strong>Brand:</strong> {parent_bu} / {brand}<br>
    <strong>Date:</strong> {report_date}<br>
    <strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
    <strong>Error:</strong> {type(error).__name__}: {error}
  </div>

  <h3>Traceback</h3>
  <div class="tb">{tb}</div>

  <div class="footer">
    GTF Deliverability Ingest &bull; {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} &bull; Server: {os.uname().nodename}
  </div>
</body>
</html>"""

    _send_email(
        subject=f"[GTF Ingest] ❌ FAILED — {parent_bu}/{brand} {report_date}",
        html_body=html,
    )


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    args = parse_args()

    date_str    = args.date if args.date else (datetime.now() - timedelta(days=1)).strftime('%Y%m%d')
    report_date = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"

    brands = load_brands()
    if args.brand:
        brands = [b for b in brands if b['brand'].upper() == args.brand.upper()]
        if not brands:
            print(f"  ERROR: brand '{args.brand}' not found in brands.json")
            sys.exit(1)

    print(f"\n{'='*50}")
    print(f"  Ingest — {report_date}  ({len(brands)} brand(s))")
    print(f"{'='*50}\n")

    db.init_db()

    for entry in brands:
        parent_bu = entry['parent_bu'].upper()
        brand     = entry['brand'].upper()

        print(f"\n--- {parent_bu}/{brand} ---")

        try:
            db.upsert_client(parent_bu, brand)

            # ── Fetch data ────────────────────────────────────────────────────
            if args.local:
                from pathlib import Path
                csv_files    = [str(p) for p in Path(LOCAL['extract_dir']).rglob('*.csv')]
                parser       = SftpZipParser({'sftp': SFTP, 'local': LOCAL})
                parser._parse_files(csv_files)
                data         = parser.parsed_data
                zip_filename = 'local'
                print(f"  [LOCAL] Loaded {len(csv_files)} CSVs from {LOCAL['extract_dir']}")
            else:
                sftp_cfg     = build_sftp_config(parent_bu, brand, date_str)
                zip_filename = os.path.basename(sftp_cfg['remote_path'])
                try:
                    data = SftpZipParser({'sftp': sftp_cfg, 'local': LOCAL}).run()
                except FileNotFoundError as missing:
                    print(f"  [SKIP] {missing}")
                    send_missing_email(report_date, parent_bu, brand, zip_filename)
                    continue

            # ── Filter test emails ────────────────────────────────────────────
            data, dropped = filter_test_emails(data)
            if dropped:
                print(f"  Filtered {dropped} test-email rows (domains: {', '.join(sorted(TEST_DOMAINS))})")

            # ── Build send_id → actual send date map from Sent.csv ────────────
            send_date_map = build_send_date_map(data.get('Sent', []), fallback_date=report_date)
            unique_send_dates = set(send_date_map.values())
            print(f"  send_date_map: {len(send_date_map)} send_ids across dates: {sorted(unique_send_dates)}")

            # ── Store raw events (each row gets its send_id's actual send date) ─
            table_map = {
                'Sent':    'events_sent',
                'Opens':   'events_opens',
                'Clicks':  'events_clicks',
                'Bounces': 'events_bounces',
                'Unsubs':  'events_unsubs',
                'NotSent': 'events_not_sent',
            }
            for key, table in table_map.items():
                rows = data.get(key, [])
                # group rows by their resolved report_date and insert per date
                by_date: Dict[str, list] = {}
                for r in rows:
                    rd = send_date_map.get(r.get('send_id', ''), report_date)
                    by_date.setdefault(rd, []).append(r)
                for rd, rd_rows in by_date.items():
                    db.insert_rows(table, rd_rows, rd, parent_bu, brand)
                print(f"  Stored {len(rows):>5} rows → {table}")

            # ── Store lists ───────────────────────────────────────────────────
            db.upsert_lists(data.get('Lists', []), report_date, parent_bu, brand)
            print(f"  Stored {len(data.get('Lists', [])):>5} rows → lists")

            # ── Compute & store summaries ─────────────────────────────────────
            summaries = compute_metrics(data, send_date_map, report_date, parent_bu, brand)
            for s in summaries:
                db.upsert_summary(s)
            print(f"  Computed {len(summaries)} send-level summaries")

            # ── Top URLs ──────────────────────────────────────────────────────
            top_urls = compute_top_urls(data, send_date_map, report_date, parent_bu, brand)
            for rd in set(r['report_date'] for r in top_urls):
                rd_urls = [r for r in top_urls if r['report_date'] == rd]
                db.upsert_top_urls(rd_urls, rd, parent_bu, brand)
            print(f"  Stored {len(top_urls)} URL rows → top_urls")

            # ── Export dashboard JSON ─────────────────────────────────────────
            if ENV == 'local':
                export_data_json(parent_bu, brand)

            print(f"  Done. report_date={report_date}  parent_bu={parent_bu}  brand={brand}")

            # ── Success email ─────────────────────────────────────────────────
            send_success_email(report_date, parent_bu, brand, zip_filename, net_rows, summaries, data, dropped)

        except Exception as e:
            tb = traceback.format_exc()
            print(f"  ERROR [{parent_bu}/{brand}]: {e}\n{tb}")
            send_error_email(report_date, parent_bu, brand, e, tb)
            # continue processing remaining brands

    print(f"\n{'='*50}")
    print(f"  All brands processed for {report_date}")
    print(f"{'='*50}\n")


if __name__ == '__main__':
    main()
