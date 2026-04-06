"""
ClearSight.ai — Flask Backend
Main application entry point.
"""

import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from log_parser import parse_log_content, detect_threats, get_log_summary
from gemini_service import analyze_threats, generate_protection_rules, generate_overall_score, generate_antigravity_config

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# Config
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max


@app.route('/')
def serve_frontend():
    """Serve the frontend SPA."""
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files."""
    return send_from_directory(app.static_folder, path)


@app.route('/api/analyze', methods=['POST'])
def analyze_log():
    """
    Analyze uploaded log file or pasted log text.
    Accepts: multipart file upload OR JSON with 'log_text' field.
    """
    log_content = None

    # Check for file upload
    if 'file' in request.files:
        file = request.files['file']
        if file.filename:
            log_content = file.read().decode('utf-8', errors='ignore')

    # Check for pasted text
    if not log_content and request.is_json:
        data = request.get_json()
        log_content = data.get('log_text', '')

    # Check form data
    if not log_content:
        log_content = request.form.get('log_text', '')

    if not log_content or not log_content.strip():
        return jsonify({'error': 'No log content provided. Upload a file or paste log text.'}), 400

    try:
        # Step 1: Parse log entries
        entries = parse_log_content(log_content)

        if not entries:
            return jsonify({'error': 'Could not parse any log entries. Make sure your log is in Apache/Nginx common log format.'}), 400

        # Step 2: Detect threats locally
        threats = detect_threats(entries)
        summary = get_log_summary(entries, threats)

        if not threats:
            return jsonify({
                'threats': [],
                'summary': summary,
                'scorecard': {
                    'safety_score': 95,
                    'grade': 'A',
                    'headline': 'Your Website Looks Clean!',
                    'summary': f'We analyzed {summary["total_requests"]} requests from {summary["unique_ips"]} unique visitors and found no suspicious activity. Your website appears to be safe!',
                    'top_concern': 'No significant threats detected.',
                    'fun_stat': f'All {summary["total_requests"]} requests to your site were from friendly visitors!',
                    'recommendation': 'Keep your software updated and consider adding a WAF for extra protection.',
                    'vibe': 'excellent',
                    'stats': {
                        'total_requests': summary['total_requests'],
                        'threats_found': 0,
                        'malicious_ips': 0,
                        'attack_types': 0,
                    }
                },
                'message': 'No threats detected! Your website looks clean.'
            })

        # Step 3: Enrich with Gemini AI
        analyzed_threats = analyze_threats(threats, summary)

        # Step 4: Generate overall scorecard
        scorecard = generate_overall_score(analyzed_threats, summary)

        return jsonify({
            'threats': analyzed_threats,
            'summary': summary,
            'scorecard': scorecard,
            'message': f'Analysis complete. Found {len(analyzed_threats)} threat groups.'
        })

    except Exception as e:
        print(f"Analysis error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500


@app.route('/api/generate-fix', methods=['POST'])
def generate_fix():
    """Generate protection rules for a specific threat."""
    if not request.is_json:
        return jsonify({'error': 'JSON body required'}), 400

    threat_info = request.get_json()

    try:
        rules = generate_protection_rules(threat_info)
        return jsonify(rules)
    except Exception as e:
        print(f"Fix generation error: {e}")
        return jsonify({'error': f'Fix generation failed: {str(e)}'}), 500


@app.route('/api/generate-config', methods=['POST'])
def generate_config():
    """Generate Anti-Gravity security configuration from analysis results."""
    if not request.is_json:
        return jsonify({'error': 'JSON body required'}), 400

    data = request.get_json()
    threats = data.get('threats', [])
    summary = data.get('summary', {})

    if not threats and not summary:
        return jsonify({'error': 'No threat data provided'}), 400

    try:
        config = generate_antigravity_config(threats, summary)
        return jsonify(config)
    except Exception as e:
        print(f"Config generation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Configuration generation failed: {str(e)}'}), 500


@app.route('/api/sample', methods=['GET'])
def get_sample():
    """Return sample log file content for demo."""
    sample_path = os.path.join(os.path.dirname(__file__), 'sample.log')
    try:
        with open(sample_path, 'r') as f:
            content = f.read()
        return jsonify({'log_text': content})
    except FileNotFoundError:
        return jsonify({'error': 'Sample log file not found'}), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("""
    ==========================================
    |        ClearSight.ai  Backend          |
    |    The X-Ray for Your Website          |
    |                                        |
    |  Running on http://localhost:5000      |
    ==========================================
    """)
    app.run(debug=True, port=port)
