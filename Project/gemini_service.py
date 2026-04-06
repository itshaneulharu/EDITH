"""
ClearSight.ai — Gemini AI Service
Handles all AI-powered analysis using Google's Gemini API.
"""

import json
import math
import os
import google.generativeai as genai

def get_client():
    """Configure Gemini client."""
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    genai.configure(api_key=api_key)
    return genai


def analyze_threats(threats, summary):
    """
    Send grouped threats to Gemini for plain-English analysis.
    Returns enriched threat data with explanations.
    """
    client = get_client()

    threats_text = ""
    for i, t in enumerate(threats):
        threats_text += f"""
Threat #{i+1}:
- Type: {t['type']}
- Severity: {t['severity']}
- Attacker IP: {t['ip']}
- Number of requests: {t['count']}
- Target URLs: {', '.join(t['urls'][:3])}
- User Agent: {t['user_agent']}
- Sample log line: {t['samples'][0] if t['samples'] else 'N/A'}
"""
        if 'extra' in t:
            threats_text += f"- Extra info: {json.dumps(t['extra'])}\n"

    prompt = f"""You are ClearSight.ai, a cybersecurity expert who explains server log threats in simple, plain English that anyone can understand — like explaining to a 10-year-old.

Here is a summary of a website's server log analysis:
- Total requests analyzed: {summary['total_requests']}
- Unique visitors (IPs): {summary['unique_ips']}
- Suspicious requests found: {summary['suspicious_requests']}
- Critical threats: {summary['critical_threats']}
- Medium threats: {summary['medium_threats']}
- Attack types detected: {', '.join(summary['attack_types'])}

Here are the threats detected:
{threats_text}

For EACH threat, provide a JSON response with this EXACT structure (return a valid JSON array):
[
  {{
    "threat_number": 1,
    "attack_type": "the type of attack",
    "severity": "Critical" or "Medium" or "Low",
    "title": "A short, scary but accurate 5-8 word title (use emojis!)",
    "explanation": "Exactly 1 simple sentence explaining what happened. No technical jargon. Use a conversational tone.",
    "what_they_tried": "One sentence: what specifically did the attacker try to access or steal?",
    "risk_level_explanation": "One sentence explaining why this severity level was assigned",
    "attacker_ip": "the IP address",
    "request_count": number,
    "icon": "one of: skull, bug, key, eye, shield, zap, alert-triangle"
  }}
]

IMPORTANT: Return ONLY the JSON array, no markdown formatting, no code blocks, just pure JSON."""

    try:
        model = client.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)

        text = response.text.strip()
        # Clean up potential markdown code block wrapping
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3]
        if text.startswith('json'):
            text = text[4:]
        text = text.strip()

        analyzed = json.loads(text)
        return analyzed
    except json.JSONDecodeError as e:
        # Fallback: create basic analysis without AI
        return create_fallback_analysis(threats)
    except Exception as e:
        print(f"Gemini API error: {e}")
        return create_fallback_analysis(threats)


def generate_protection_rules(threat_info):
    """Generate protection rules for a specific threat."""
    client = get_client()

    prompt = f"""You are ClearSight.ai, a cybersecurity expert. Generate practical protection rules for the following threat:

Threat Type: {threat_info.get('attack_type', threat_info.get('type', 'Unknown'))}
Severity: {threat_info.get('severity', 'Medium')}
Attacker IP: {threat_info.get('attacker_ip', threat_info.get('ip', 'Unknown'))}
Description: {threat_info.get('explanation', threat_info.get('title', 'Security threat detected'))}

Generate protection in this JSON format (return ONLY valid JSON, no markdown):
{{
  "iptables": "The exact iptables command(s) to block this threat. Multiple commands separated by newlines.",
  "htaccess": "The .htaccess rules to add for Apache servers to prevent this attack.",
  "cloudflare": "Step-by-step instructions for setting up a Cloudflare firewall rule.",
  "checklist": [
    "Step 1: A clear action item anyone can follow",
    "Step 2: Another action item",
    "Step 3: Another action item",
    "Step 4: Another action item",
    "Step 5: Another action item"
  ],
  "explanation": "A 2-sentence plain English explanation of what these rules do and why they help."
}}

IMPORTANT: Return ONLY the JSON object, no markdown formatting, no code blocks."""

    try:
        model = client.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)

        text = response.text.strip()
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3]
        if text.startswith('json'):
            text = text[4:]
        text = text.strip()

        return json.loads(text)
    except Exception as e:
        print(f"Gemini API error for protection: {e}")
        return {
            'iptables': f"iptables -A INPUT -s {threat_info.get('attacker_ip', 'ATTACKER_IP')} -j DROP",
            'htaccess': f"# Block attacker IP\nDeny from {threat_info.get('attacker_ip', 'ATTACKER_IP')}",
            'cloudflare': "Go to Cloudflare Dashboard → Security → WAF → Create Rule → Block IP",
            'checklist': [
                "Block the attacker's IP address immediately",
                "Review your server configuration for vulnerabilities",
                "Update all software to the latest versions",
                "Enable a Web Application Firewall (WAF)",
                "Set up alerts for similar future attacks"
            ],
            'explanation': "These rules block the attacker and add extra layers of security to prevent similar attacks."
        }


def generate_overall_score(threats_analyzed, summary):
    """Generate overall safety scorecard using Gemini."""
    client = get_client()

    threats_brief = ""
    for t in threats_analyzed:
        threats_brief += f"- {t.get('title', 'Unknown')}: {t.get('severity', 'Unknown')} severity\n"

    prompt = f"""You are ClearSight.ai. Generate a Spotify Wrapped-style safety scorecard for a website based on its server log analysis.

Stats:
- Total requests: {summary['total_requests']}
- Unique visitors: {summary['unique_ips']}
- Suspicious requests: {summary['suspicious_requests']}
- Critical threats: {summary['critical_threats']}
- Medium threats: {summary['medium_threats']}
- Attack types: {', '.join(summary['attack_types'])}
- Malicious IPs: {len(summary['malicious_ips'])}

Threats found:
{threats_brief}

Generate a JSON response (ONLY valid JSON, no markdown):
{{
  "safety_score": A number from 0-100 where 100 is perfectly safe. Be realistic — if there are critical threats like SQL injection, the score should be low (20-40). Medium threats bring it to 40-60. Few/low threats = 70-90.,
  "grade": "A letter grade A+ through F based on the score",
  "headline": "A dramatic, engaging 5-8 word headline about the website's security status (like Spotify Wrapped titles)",
  "summary": "A 2-3 sentence overall assessment in plain English. Be honest but not alarming. Give hope.",
  "top_concern": "The single biggest security issue in one sentence",
  "fun_stat": "A quirky, memorable stat like 'Your site was scanned more times than a grocery store barcode'",
  "recommendation": "The #1 thing the website owner should do RIGHT NOW in one sentence",
  "vibe": "one of: critical, warning, caution, good, excellent"
}}

IMPORTANT: Return ONLY the JSON, no markdown."""

    try:
        model = client.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)

        text = response.text.strip()
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3]
        if text.startswith('json'):
            text = text[4:]
        text = text.strip()

        scorecard = json.loads(text)
        scorecard['stats'] = {
            'total_requests': summary['total_requests'],
            'threats_found': len(threats_analyzed),
            'malicious_ips': len(summary['malicious_ips']),
            'attack_types': len(summary['attack_types']),
        }
        return scorecard
    except Exception as e:
        print(f"Gemini API error for scorecard: {e}")
        score = calculate_fallback_score(summary)
        grade = score_to_grade(score)
        vibe = 'critical' if score < 30 else 'warning' if score < 50 else 'caution' if score < 70 else 'good' if score < 85 else 'excellent'

        blocked = summary.get('blocked_attacks', 0)
        succeeded = summary.get('succeeded_attacks', 0)
        total_attacks = blocked + succeeded
        block_pct = int((blocked / total_attacks * 100)) if total_attacks > 0 else 0

        if score >= 70:
            headline = 'Your Defenses Are Holding Strong'
            top_concern = f'{succeeded} attack(s) may have reached your application, but {blocked} were blocked.'
            recommendation = 'Add a WAF layer for defense-in-depth and monitor the succeeded requests.'
        elif score >= 40:
            headline = 'Your Website Needs Reinforcement'
            top_concern = f'{summary["critical_threats"]} critical threats detected — {succeeded} attacks may have bypassed defenses.'
            recommendation = 'Block the identified malicious IPs immediately and enable request validation.'
        else:
            headline = 'Urgent: Your Website Is Under Active Attack'
            top_concern = f'{summary["critical_threats"]} critical threats with {succeeded} successful penetrations detected.'
            recommendation = 'Deploy the Anti-Gravity configuration immediately to block all identified attackers.'

        return {
            'safety_score': score,
            'grade': grade,
            'headline': headline,
            'summary': f"We analyzed {summary['total_requests']} requests and found {summary['suspicious_requests']} suspicious ones from {len(summary['malicious_ips'])} attackers. {block_pct}% of attacks were blocked by your server.",
            'top_concern': top_concern,
            'fun_stat': f"Your server heroically blocked {blocked} of {total_attacks} attack attempts — like a bouncer rejecting {blocked} fake IDs at the door!",
            'recommendation': recommendation,
            'vibe': vibe,
            'stats': {
                'total_requests': summary['total_requests'],
                'threats_found': len(threats_analyzed),
                'malicious_ips': len(summary['malicious_ips']),
                'attack_types': len(summary['attack_types']),
                'blocked_attacks': blocked,
                'succeeded_attacks': succeeded,
            }
        }


def create_fallback_analysis(threats):
    """Fallback analysis when Gemini is unavailable."""
    fallback_explanations = {
        'SQL Injection': {
            'title': 'Database Theft Attempt Detected',
            'explanation': 'Someone tried to trick your website into revealing its database — like a burglar trying to guess the code to your safe. They sent specially crafted text to your search bar hoping to extract usernames and passwords.',
            'icon': 'skull',
        },
        'Cross-Site Scripting (XSS)': {
            'title': 'Malicious Code Injection Attempt',
            'explanation': 'An attacker tried to inject dangerous code into your website pages. Imagine someone slipping a fake sign into your store that redirects customers to a scam — that\'s essentially what XSS does.',
            'icon': 'bug',
        },
        'Brute Force Attack': {
            'title': 'Password Guessing Attack Detected',
            'explanation': 'Someone repeatedly tried to guess the login password — like a thief trying every key on a keychain until one fits your front door lock.',
            'icon': 'key',
        },
        'Path Traversal': {
            'title': 'Unauthorized File Access Attempt',
            'explanation': 'An attacker tried to sneak into restricted folders on your server — like someone trying to peek behind the "Employees Only" door at a restaurant.',
            'icon': 'eye',
        },
        'Sensitive File Access': {
            'title': 'Secret Files Were Targeted',
            'explanation': 'Someone tried to access sensitive configuration files on your website — like a spy trying to find the blueprints to your house.',
            'icon': 'eye',
        },
        'Automated Scanner/Bot': {
            'title': 'Robot Scanning Your Website',
            'explanation': 'An automated tool scanned your website looking for weaknesses — like a burglar casing a house before attempting a break-in.',
            'icon': 'zap',
        },
        'Server Error (Possible Exploit)': {
            'title': 'Server Crashed From Attack',
            'explanation': 'Requests caused your server to crash (500 errors), which could mean someone found a vulnerability — like finding a loose brick in your wall.',
            'icon': 'alert-triangle',
        },
    }

    result = []
    for i, t in enumerate(threats):
        fb = fallback_explanations.get(t['type'], {
            'title': f'{t["type"]} Detected',
            'explanation': 'A suspicious activity was detected on your website that requires attention.',
            'icon': 'shield',
        })

        result.append({
            'threat_number': i + 1,
            'attack_type': t['type'],
            'severity': t['severity'],
            'title': fb['title'],
            'explanation': fb['explanation'],
            'what_they_tried': f"Tried to exploit your website via {t['type'].lower()}",
            'risk_level_explanation': f"Rated as {t['severity']} due to the nature of {t['type'].lower()} attacks",
            'attacker_ip': t['ip'],
            'request_count': t['count'],
            'icon': fb['icon'],
        })

    return result


def calculate_fallback_score(summary):
    """
    Realistic safety score using weighted model factoring in:
    - Severity of threats (critical vs medium)
    - Whether attacks were blocked or succeeded
    - Diversity of attack types
    - Ratio of malicious to legitimate traffic
    """
    critical = summary.get('critical_threats', 0)
    medium = summary.get('medium_threats', 0)
    blocked = summary.get('blocked_attacks', 0)
    succeeded = summary.get('succeeded_attacks', 0)
    total_attacks = blocked + succeeded
    total_requests = summary.get('total_requests', 1)
    attack_types = len(summary.get('attack_types', []))
    malicious_ips = len(summary.get('malicious_ips', []))

    score = 100.0

    # Penalty for critical threats (logarithmic — first ones hurt most)
    if critical > 0:
        score -= min(35, 15 * math.log2(critical + 1))

    # Penalty for medium threats
    if medium > 0:
        score -= min(20, 8 * math.log2(medium + 1))

    # Penalty for attack diversity
    if attack_types > 0:
        score -= min(10, attack_types * 2.5)

    # Penalty for number of malicious IPs
    if malicious_ips > 0:
        score -= min(10, malicious_ips * 1.5)

    # BONUS for blocking ratio
    if total_attacks > 0:
        block_ratio = blocked / total_attacks
        score += block_ratio * 20

    # Penalty for succeeded attacks
    if succeeded > 0:
        score -= min(25, 10 * math.log2(succeeded + 1))

    # Penalty for high attack-to-request ratio
    if total_requests > 0:
        attack_ratio = total_attacks / total_requests
        if attack_ratio > 0.5:
            score -= 10
        elif attack_ratio > 0.3:
            score -= 5

    return max(0, min(100, int(round(score))))


def score_to_grade(score):
    """Convert numeric score to letter grade."""
    if score >= 93: return 'A+'
    if score >= 85: return 'A'
    if score >= 78: return 'B+'
    if score >= 70: return 'B'
    if score >= 63: return 'C+'
    if score >= 55: return 'C'
    if score >= 45: return 'D'
    if score >= 35: return 'D-'
    return 'F'


def generate_antigravity_config(threats_analyzed, summary):
    """
    Generate comprehensive Anti-Gravity security configuration.
    Returns IP blocklists, DPI rules, firewall rules, and validation schemas.
    """
    client = get_client()

    malicious_ips = summary.get('malicious_ips', [])
    attack_types = summary.get('attack_types', [])

    threats_detail = ""
    for t in threats_analyzed:
        threats_detail += f"- {t.get('attack_type', 'Unknown')}: {t.get('severity','Unknown')} from {t.get('attacker_ip','?')} ({t.get('request_count',0)} attempts)\n"

    prompt = f"""You are ClearSight.ai's Anti-Gravity Engine — an advanced security configuration generator.

Based on this threat analysis, generate a comprehensive security configuration:

Threat Profile:
- {summary['suspicious_requests']} suspicious requests detected
- {summary['critical_threats']} critical, {summary['medium_threats']} medium threats
- {len(malicious_ips)} malicious IPs: {', '.join(malicious_ips)}
- Attack types: {', '.join(attack_types)}
- Blocked: {summary.get('blocked_attacks', 0)}, Succeeded: {summary.get('succeeded_attacks', 0)}

Threats:
{threats_detail}

Generate a JSON response (ONLY valid JSON, no markdown):
{{
  "ip_blocklist": {{
    "blocked_ips": [
      {{
        "ip": "x.x.x.x",
        "reason": "Short reason",
        "threat_type": "Attack type",
        "risk_level": "Critical or Medium"
      }}
    ],
    "iptables_rules": "Complete iptables commands to block all IPs, one per line",
    "nginx_deny": "Nginx deny directives",
    "htaccess_deny": ".htaccess Deny rules"
  }},
  "dpi_rules": [
    {{
      "name": "Rule name",
      "pattern": "Regex pattern",
      "action": "DROP or REJECT",
      "description": "What this catches in plain English",
      "attack_type": "SQL Injection / XSS / etc"
    }}
  ],
  "request_validation": [
    {{
      "rule_name": "Name",
      "target": "URL / Headers / Body",
      "validation": "Specific validation",
      "description": "What this prevents"
    }}
  ],
  "firewall_config": {{
    "iptables": "Complete iptables script",
    "cloudflare_waf": "Cloudflare WAF steps",
    "modsecurity": "ModSecurity rules"
  }},
  "safety_score_after": 92,
  "grade_after": "A",
  "summary": "2-3 sentence summary of what this configuration does"
}}

IMPORTANT: Return ONLY the JSON, no markdown."""

    try:
        model = client.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)

        text = response.text.strip()
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3]
        if text.startswith('json'):
            text = text[4:]
        text = text.strip()

        config = json.loads(text)
        return config
    except Exception as e:
        print(f"Gemini API error for antigravity config: {e}")
        return generate_fallback_config(malicious_ips, attack_types, summary)


def generate_fallback_config(malicious_ips, attack_types, summary):
    """Fallback Anti-Gravity config when Gemini is unavailable."""
    blocked_ips = []
    for ip in malicious_ips:
        blocked_ips.append({
            'ip': ip,
            'reason': 'Identified as source of malicious traffic',
            'threat_type': 'Multiple attack vectors',
            'risk_level': 'Critical'
        })

    iptables_lines = [f'iptables -A INPUT -s {ip} -j DROP' for ip in malicious_ips]
    nginx_lines = [f'deny {ip};' for ip in malicious_ips]
    htaccess_lines = ['order allow,deny'] + [f'deny from {ip}' for ip in malicious_ips] + ['allow from all']

    dpi_rules = []
    dpi_map = {
        'SQL Injection': {
            'name': 'Block SQL Injection Patterns',
            'pattern': r"(?i)(union\\s+select|or\\s+'1'\\s*=\\s*'1|drop\\s+table|sleep\\s*\\(|benchmark)",
            'description': 'Catches SQL injection attempts trying to steal or destroy database data'
        },
        'Cross-Site Scripting (XSS)': {
            'name': 'Block XSS Payloads',
            'pattern': r'(?i)(<script|javascript:|onerror\\s*=|onload\\s*=|<svg|alert\\s*\\()',
            'description': 'Blocks attempts to inject malicious JavaScript into your pages'
        },
        'Path Traversal': {
            'name': 'Block Path Traversal',
            'pattern': r'(\\.\\.\\/|%2e%2e%2f|etc\\/passwd|etc\\/shadow)',
            'description': 'Prevents attackers from reading sensitive system files'
        },
        'Brute Force Attack': {
            'name': 'Rate Limit Login Attempts',
            'pattern': r'POST\\s+\\/login',
            'description': 'Detects rapid-fire login attempts (brute force password guessing)'
        },
        'Sensitive File Access': {
            'name': 'Block Sensitive File Probing',
            'pattern': r'(?i)(\\.env|\\.git|\\.htaccess|wp-admin|phpmyadmin|backup\\.sql)',
            'description': 'Blocks attempts to access configuration files and admin panels'
        },
        'Automated Scanner/Bot': {
            'name': 'Block Known Scanner User-Agents',
            'pattern': r'(?i)(nmap|nikto|masscan|sqlmap|dirbuster|ZmEu)',
            'description': 'Identifies and blocks automated vulnerability scanners'
        },
        'Server Error (Possible Exploit)': {
            'name': 'Monitor Server Error Triggers',
            'pattern': r'HTTP\\/1\\.[01]"\\s+5\\d{2}',
            'description': 'Flags requests that cause server errors — potential exploit attempts'
        }
    }

    for at in attack_types:
        if at in dpi_map:
            rule = dpi_map[at]
            dpi_rules.append({
                'name': rule['name'],
                'pattern': rule['pattern'],
                'action': 'DROP',
                'description': rule['description'],
                'attack_type': at
            })

    validation_rules = [
        {
            'rule_name': 'Sanitize URL Parameters',
            'target': 'URL Parameters',
            'validation': 'Strip or reject any URL parameter containing SQL keywords, script tags, or path traversal sequences',
            'description': 'Neutralizes SQL Injection and XSS via URL manipulation'
        },
        {
            'rule_name': 'Validate Content-Type Headers',
            'target': 'Headers',
            'validation': 'Reject requests with missing or unexpected Content-Type on POST/PUT methods',
            'description': 'Prevents payload smuggling via malformed requests'
        },
        {
            'rule_name': 'Enforce Request Body Size Limits',
            'target': 'Body',
            'validation': 'Limit request body to 1MB for standard endpoints, 10MB for file uploads',
            'description': 'Prevents buffer overflow and denial-of-service via oversized payloads'
        },
        {
            'rule_name': 'Block Suspicious User-Agents',
            'target': 'Headers',
            'validation': 'Reject requests from known scanner/bot user-agents (sqlmap, nikto, ZmEu, masscan)',
            'description': 'Stops automated vulnerability scanners at the door'
        },
        {
            'rule_name': 'Rate Limit Authentication Endpoints',
            'target': 'URL',
            'validation': 'Max 5 requests per minute per IP to /login, /auth, /api/token',
            'description': 'Prevents brute-force password attacks'
        }
    ]

    full_iptables = '#!/bin/bash\n# Anti-Gravity Firewall Configuration\n# Generated by ClearSight.ai\n\n'
    full_iptables += '# Block identified malicious IPs\n'
    full_iptables += '\n'.join(iptables_lines)
    full_iptables += '\n\n# Rate limit new connections\n'
    full_iptables += 'iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 50 -j DROP\n'
    full_iptables += 'iptables -A INPUT -p tcp --dport 443 -m connlimit --connlimit-above 50 -j DROP\n'
    full_iptables += '\n# Log and drop suspicious packets\n'
    full_iptables += 'iptables -A INPUT -m string --string "sqlmap" --algo bm -j DROP\n'
    full_iptables += 'iptables -A INPUT -m string --string "nikto" --algo bm -j DROP\n'
    full_iptables += 'iptables -A INPUT -m string --string "<script" --algo bm -j DROP\n'

    return {
        'ip_blocklist': {
            'blocked_ips': blocked_ips,
            'iptables_rules': '\n'.join(iptables_lines),
            'nginx_deny': '\n'.join(nginx_lines),
            'htaccess_deny': '\n'.join(htaccess_lines)
        },
        'dpi_rules': dpi_rules,
        'request_validation': validation_rules,
        'firewall_config': {
            'iptables': full_iptables,
            'cloudflare_waf': 'Go to Cloudflare Dashboard > Security > WAF > Create Rule:\n1. Block IPs: ' + ', '.join(malicious_ips) + '\n2. Challenge requests matching SQL injection patterns\n3. Block requests with scanner user-agents\n4. Rate limit /login to 5 req/min per IP',
            'modsecurity': '# ModSecurity Rules\nSecRule REMOTE_ADDR "@ipMatch ' + ','.join(malicious_ips) + '" "id:1001,phase:1,deny,status:403,msg:\'Blocked malicious IP\'"\nSecRule ARGS "@rx (?i)(union.*select|drop.*table)" "id:1002,phase:2,deny,status:403,msg:\'SQL Injection blocked\'"\nSecRule ARGS "@rx (?i)(<script|javascript:|onerror)" "id:1003,phase:2,deny,status:403,msg:\'XSS blocked\'"'
        },
        'safety_score_after': 92,
        'grade_after': 'A',
        'summary': f'This Anti-Gravity configuration blocks {len(malicious_ips)} malicious IPs, deploys {len(dpi_rules)} deep packet inspection rules to catch {len(attack_types)} attack types, and enforces {len(validation_rules)} request validation rules. Once applied, your estimated safety score rises to 92 (Grade A).'
    }
