"""
ClearSight.ai — Log Parser Module
Parses Apache/Nginx common log format and extracts suspicious entries.
"""

import re
from collections import Counter, defaultdict

# Apache/Nginx Combined Log Format regex
LOG_PATTERN = re.compile(
    r'(?P<ip>\d{1,3}(?:\.\d{1,3}){3})\s+'
    r'(?P<ident>\S+)\s+'
    r'(?P<user>\S+)\s+'
    r'\[(?P<timestamp>[^\]]+)\]\s+'
    r'"(?P<method>\S+)\s+(?P<url>\S+)\s+(?P<protocol>[^"]+)"\s+'
    r'(?P<status>\d{3})\s+'
    r'(?P<size>\d+|-)\s+'
    r'"(?P<referrer>[^"]*)"\s+'
    r'"(?P<user_agent>[^"]*)"'
)

# Suspicious patterns
SQL_INJECTION_PATTERNS = [
    r"(?i)(union\s+select|or\s+'1'\s*=\s*'1|drop\s+table|insert\s+into|select\s+.*\s+from)",
    r"(?i)(sleep\s*\(|benchmark\s*\(|waitfor\s+delay)",
    r"(?i)(--|;--|%27|')",
    r"(?i)(sqlmap|havij)",
]

XSS_PATTERNS = [
    r"(?i)(<script|<\/script|javascript:|onerror\s*=|onload\s*=)",
    r"(?i)(alert\s*\(|document\.cookie|<svg|<img\s+src\s*=\s*x)",
    r"(?i)(%3Cscript|%3C%2Fscript)",
]

PATH_TRAVERSAL_PATTERNS = [
    r"(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/)",
    r"(?i)(etc\/passwd|etc\/shadow|boot\.ini|win\.ini)",
]

SCANNER_USER_AGENTS = [
    r"(?i)(nmap|nikto|masscan|zmeu|sqlmap|dirbuster|gobuster|wfuzz|burp)",
    r"(?i)(python-requests|curl\/|wget\/|scrapy)",
]

SENSITIVE_PATHS = [
    r"(?i)(\.env|\.git|\.htaccess|\.htpasswd|wp-admin|wp-login|phpmyadmin|server-status|server-info)",
    r"(?i)(backup\.sql|database\.sql|\.sql\.gz|\.tar\.gz|config\.php|setup\.php)",
    r"(?i)(\/admin|\/cgi-bin|\/scripts\/|\/pma\/)",
]

BRUTE_FORCE_THRESHOLD = 5  # requests from same IP to login within short time


def parse_log_line(line):
    """Parse a single log line into a dict."""
    match = LOG_PATTERN.match(line.strip())
    if match:
        return match.groupdict()
    return None


def parse_log_content(content):
    """Parse entire log content and return list of parsed entries."""
    entries = []
    for line in content.strip().split('\n'):
        if line.strip():
            parsed = parse_log_line(line)
            if parsed:
                parsed['raw'] = line.strip()
                entries.append(parsed)
    return entries


def check_pattern(text, patterns):
    """Check if text matches any of the given regex patterns."""
    for pattern in patterns:
        if re.search(pattern, text):
            return True
    return False


def detect_threats(entries):
    """Analyze parsed log entries and detect threats."""
    threats = []
    ip_login_attempts = defaultdict(list)
    ip_request_count = Counter()
    ip_error_count = defaultdict(lambda: Counter())

    for entry in entries:
        ip = entry['ip']
        url = entry['url']
        status = int(entry['status'])
        user_agent = entry['user_agent']
        method = entry['method']
        raw = entry['raw']

        ip_request_count[ip] += 1

        if status >= 400:
            ip_error_count[ip][status] += 1

        # Track login attempts for brute force detection
        if 'login' in url.lower() and method == 'POST':
            ip_login_attempts[ip].append(entry)

        # SQL Injection
        if check_pattern(url, SQL_INJECTION_PATTERNS) or check_pattern(user_agent, [r"(?i)sqlmap"]):
            threats.append({
                'type': 'Database Attacker',
                'severity': 'Critical',
                'ip': ip,
                'url': url,
                'status': status,
                'user_agent': user_agent,
                'raw_log': raw,
                'method': method,
            })

        # XSS
        elif check_pattern(url, XSS_PATTERNS):
            threats.append({
                'type': 'Script Injector',
                'severity': 'Critical',
                'ip': ip,
                'url': url,
                'status': status,
                'user_agent': user_agent,
                'raw_log': raw,
                'method': method,
            })

        # Path Traversal
        elif check_pattern(url, PATH_TRAVERSAL_PATTERNS):
            threats.append({
                'type': 'File Explorer',
                'severity': 'Critical',
                'ip': ip,
                'url': url,
                'status': status,
                'user_agent': user_agent,
                'raw_log': raw,
                'method': method,
            })

        # Sensitive file/path access
        elif check_pattern(url, SENSITIVE_PATHS):
            threats.append({
                'type': 'Secret Sneaker',
                'severity': 'Medium',
                'ip': ip,
                'url': url,
                'status': status,
                'user_agent': user_agent,
                'raw_log': raw,
                'method': method,
            })

        # Scanner/Bot detection (only if not already flagged)
        elif check_pattern(user_agent, SCANNER_USER_AGENTS):
            threats.append({
                'type': 'Silent Scanner',
                'severity': 'Medium',
                'ip': ip,
                'url': url,
                'status': status,
                'user_agent': user_agent,
                'raw_log': raw,
                'method': method,
            })

        # Server errors (500s) as indicators
        elif status >= 500:
            threats.append({
                'type': 'Server Error (Possible Exploit)',
                'severity': 'Medium',
                'ip': ip,
                'url': url,
                'status': status,
                'user_agent': user_agent,
                'raw_log': raw,
                'method': method,
            })

    # Brute force detection
    for ip, attempts in ip_login_attempts.items():
        failed = [a for a in attempts if int(a['status']) == 403]
        if len(failed) >= BRUTE_FORCE_THRESHOLD:
            succeeded = [a for a in attempts if int(a['status']) == 200]
            threats.append({
                'type': 'Password Guesser',
                'severity': 'Critical' if succeeded else 'Critical',
                'ip': ip,
                'url': '/login',
                'status': 403,
                'user_agent': attempts[0]['user_agent'],
                'raw_log': attempts[0]['raw'],
                'method': 'POST',
                'extra': {
                    'failed_attempts': len(failed),
                    'successful_after_brute': len(succeeded) > 0,
                }
            })

    # Group and deduplicate threats by IP + type
    grouped = group_threats(threats)

    return grouped


def group_threats(threats):
    """Group threats by IP and attack type, count occurrences."""
    groups = defaultdict(lambda: {
        'count': 0,
        'samples': [],
        'urls': set(),
    })

    for t in threats:
        key = (t['ip'], t['type'])
        groups[key]['count'] += 1
        groups[key]['type'] = t['type']
        groups[key]['severity'] = t['severity']
        groups[key]['ip'] = t['ip']
        groups[key]['user_agent'] = t['user_agent']
        groups[key]['urls'].add(t['url'])
        if len(groups[key]['samples']) < 3:
            groups[key]['samples'].append(t['raw_log'])
        if 'extra' in t:
            groups[key]['extra'] = t['extra']

    result = []
    for key, data in groups.items():
        data['urls'] = list(data['urls'])[:5]
        result.append(data)

    # Sort by severity (Critical first)
    severity_order = {'Critical': 0, 'Medium': 1, 'Low': 2}
    result.sort(key=lambda x: (severity_order.get(x['severity'], 3), -x['count']))

    return result


def get_log_summary(entries, threats):
    """Get summary stats from parsed log."""
    total = len(entries)
    unique_ips = len(set(e['ip'] for e in entries))
    status_codes = Counter(int(e['status']) for e in entries)
    threat_count = sum(t['count'] for t in threats)
    critical_count = sum(1 for t in threats if t['severity'] == 'Critical')
    medium_count = sum(1 for t in threats if t['severity'] == 'Medium')
    attack_types = list(set(t['type'] for t in threats))
    malicious_ips = list(set(t['ip'] for t in threats))

    # Count blocked vs succeeded attacks for accurate scoring
    blocked_attacks = 0
    succeeded_attacks = 0
    for t in threats:
        samples = t.get('samples', [])
        for sample in samples:
            parsed = parse_log_line(sample)
            if parsed:
                status = int(parsed['status'])
                if status in (403, 404, 400, 401):
                    blocked_attacks += 1
                elif status in (200, 500, 302):
                    succeeded_attacks += 1
        # Also check count vs samples — remaining are estimated
        remaining = t['count'] - len(samples)
        if remaining > 0:
            # Estimate based on sample ratio
            if samples:
                sample_parsed = [parse_log_line(s) for s in samples]
                sample_blocked = sum(1 for p in sample_parsed if p and int(p['status']) in (403, 404, 400, 401))
                ratio = sample_blocked / len(samples) if samples else 0.5
                blocked_attacks += int(remaining * ratio)
                succeeded_attacks += remaining - int(remaining * ratio)

    return {
        'total_requests': total,
        'unique_ips': unique_ips,
        'status_codes': dict(status_codes),
        'suspicious_requests': threat_count,
        'critical_threats': critical_count,
        'medium_threats': medium_count,
        'attack_types': attack_types,
        'malicious_ips': malicious_ips,
        'blocked_attacks': blocked_attacks,
        'succeeded_attacks': succeeded_attacks,
    }
