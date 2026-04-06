/**
 * ClearSight.ai — Main Application Logic
 * Handles file uploads, API communication, and UI transitions
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const sections = {
        hero: document.getElementById('heroSection'),
        loader: document.getElementById('loaderSection'),
        results: document.getElementById('resultsSection'),
        scorecard: document.getElementById('scorecardSection')
    };

    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const logTextarea = document.getElementById('logTextarea');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const sampleBtn = document.getElementById('sampleBtn');
    const navStatus = document.getElementById('navStatus');

    const scannerTitle = document.getElementById('scannerTitle');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step4 = document.getElementById('step4');

    const threatsGrid = document.getElementById('threatsGrid');
    const summaryCards = document.getElementById('summaryCards');
    const viewScorecardBtn = document.getElementById('viewScorecardBtn');
    const scanAgainBtn = document.getElementById('scanAgainBtn');

    const modal = document.getElementById('protectionModal');
    const modalClose = document.getElementById('modalClose');
    const modalBody = document.getElementById('modalBody');
    const modalThreatTitle = document.getElementById('modalThreatTitle');

    const scorecardContainer = document.getElementById('scorecardContainer');

    const antigravityModal = document.getElementById('antigravityModal');
    const antigravityModalClose = document.getElementById('antigravityModalClose');
    const antigravityModalBody = document.getElementById('antigravityModalBody');

    const navBrandLogo = document.getElementById('navBrandLogo');

    let currentData = null;
    const API_BASE = 'http://localhost:5000/api';

    // =====================================================
    // BUG FIX 1: showSection now properly removes ALL active
    // classes before adding the new one — fixes scorecard
    // not showing and results section overlapping
    // =====================================================
    function showSection(sectionId) {
        Object.values(sections).forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });
        sections[sectionId].style.display = 'block';
        sections[sectionId].classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // =====================================================
    // NAVIGATION FIX: Route logo click to Home
    // =====================================================
    if (navBrandLogo) {
        navBrandLogo.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent full page reload
            
            // If already on hero section, do nothing or just scroll to top
            if (sections.hero.classList.contains('active')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Reset UI state (optional, clear file input/textarea if needed)
            // Reset the nav status back to Ready
            navStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Ready to scan</span>';
            
            showSection('hero');
        });
    }

    function setStatus(text, type = 'safe') {
        const statusSpan = navStatus.querySelector('.status-text');
        const dot = navStatus.querySelector('.status-dot');
        statusSpan.textContent = text;
        dot.style.backgroundColor = `var(--severity-${type})`;
        dot.style.boxShadow = `0 0 8px var(--severity-${type}-glow)`;
    }

    // --- Upload Logic ---
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileUpload(fileInput.files[0]);
        }
    });

    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            handleFileUpload(fileInput.files[0]);
        }
    });

    function handleFileUpload(file) {
        if (!file.name.endsWith('.log') && !file.name.endsWith('.txt')) {
            alert('Please upload a .log or .txt file');
            return;
        }
        uploadZone.innerHTML = `
            <div class="upload-icon" style="color: var(--severity-safe)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            <h3 class="upload-title">${file.name}</h3>
            <p class="upload-desc">Ready to analyze</p>
        `;
        uploadZone.style.borderColor = 'var(--severity-safe)';
    }

    analyzeBtn.addEventListener('click', () => {
        const file = fileInput.files[0];
        const text = logTextarea.value.trim();

        if (!file && !text) {
            alert('Please drop a file or paste log text first.');
            logTextarea.focus();
            return;
        }

        const formData = new FormData();
        if (file) {
            formData.append('file', file);
        } else {
            formData.append('log_text', text);
        }

        startAnalysis(formData);
    });

    sampleBtn.addEventListener('click', async () => {
        sampleBtn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span> Loading...';
        sampleBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/sample`);
            if (!response.ok) throw new Error('Failed to load sample');
            const data = await response.json();
            logTextarea.value = data.log_text;
            sampleBtn.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/>
                </svg>
                Loaded! Click Analyze
            `;
            setTimeout(() => { analyzeBtn.click(); }, 500);
        } catch (error) {
            console.error(error);
            alert('Could not load sample log. Make sure backend is running.');
            sampleBtn.innerHTML = 'Try Sample Log';
            sampleBtn.disabled = false;
        }
    });

    async function startAnalysis(formData) {
        showSection('loader');
        setStatus('Analyzing logs...', 'low');
        if (window.particles) window.particles.intensify();

        runScannerAnimation();

        try {
            const response = await fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }

            const data = await response.json();
            currentData = data;

            setTimeout(() => {
                if (window.finishScannerProgress) window.finishScannerProgress();
                renderResults(data);
                showSection('results');

                if (data.scorecard && data.scorecard.vibe === 'critical') {
                    setStatus('Critical threats found', 'critical');
                } else if (data.threats && data.threats.length > 0) {
                    setStatus('Threats detected', 'medium');
                } else {
                    setStatus('System secure', 'safe');
                    if (window.particles) window.particles.calm();
                }
            }, Math.max(0, 3500 - (Date.now() - animationStartTime)));

        } catch (error) {
            console.error('Analysis error:', error);
            alert(`Analysis failed: ${error.message}`);
            showSection('hero');
            setStatus('Ready to scan', 'safe');
            if (window.particles) window.particles.calm();
            sampleBtn.innerHTML = 'Try Sample Log';
            sampleBtn.disabled = false;
        }
    }

    let animationStartTime = 0;
    function runScannerAnimation() {
        animationStartTime = Date.now();
        [step1, step2, step3, step4].forEach(s => {
            s.classList.remove('active', 'done');
        });
        
        let progress = 0;
        scannerTitle.innerHTML = `Reading logs... <span style="float:right">${progress}%</span>`;
        
        // Progress bar simulation
        const progressInterval = setInterval(() => {
            progress += Math.floor(Math.random() * 5) + 2;
            if (progress >= 99) progress = 99;
            const currentTitle = scannerTitle.innerHTML.split('<span')[0];
            scannerTitle.innerHTML = `${currentTitle}<span style="float:right">${progress}%</span>`;
        }, 100);

        step1.classList.add('active');
        step1.querySelector('.step-text').textContent = "Reading logs...";
        setTimeout(() => {
            step1.classList.remove('active'); step1.classList.add('done');
            step2.classList.add('active');
            step2.querySelector('.step-text').textContent = "Detecting threats...";
            scannerTitle.innerHTML = `Detecting threats... <span style="float:right">${progress}%</span>`;
        }, 800);
        setTimeout(() => {
            step2.classList.remove('active'); step2.classList.add('done');
            step3.classList.add('active');
            step3.querySelector('.step-text').textContent = "Understanding attacks...";
            scannerTitle.innerHTML = `Understanding attacks... <span style="float:right">${progress}%</span>`;
        }, 1800);
        setTimeout(() => {
            step3.classList.remove('active'); step3.classList.add('done');
            step4.classList.add('active');
            step4.querySelector('.step-text').textContent = "Generating protection...";
            scannerTitle.innerHTML = `Generating protection... <span style="float:right">${progress}%</span>`;
        }, 2800);
        
        // Expose a clear function to finish progress when response arrives
        window.finishScannerProgress = () => {
             clearInterval(progressInterval);
             scannerTitle.innerHTML = `Storyboard Ready <span style="float:right">100%</span>`;
        };
    }

    function getSeverityClass(severity) {
        if (!severity) return 'low';
        const s = severity.toLowerCase();
        if (s.includes('crit')) return 'critical';
        if (s.includes('med')) return 'medium';
        return 'low';
    }

    function getIconSvg(iconName) {
        const icons = {
            'skull': '<path d="M12 2C8.13 2 5 5.13 5 9c0 1.74.5 3.37 1.41 4.75L5 22h14l-1.41-8.25C18.5 12.37 19 10.74 19 9c0-3.87-3.13-7-7-7zm0 16.5l-3.5 1.5 1-5h5l1 5-3.5-1.5z"></path><circle cx="9" cy="9" r="1.5"></circle><circle cx="15" cy="9" r="1.5"></circle>',
            'bug': '<rect x="8" y="16" width="8" height="4"></rect><circle cx="12" cy="12" r="4"></circle><path d="M14 6c0-1.1-.9-2-2-2s-2 .9-2 2"></path>',
            'key': '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>',
            'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>',
            'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
            'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10"></polygon>',
            'alert-triangle': '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>'
        };
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[iconName] || icons['shield']}</svg>`;
    }

    function renderResults(data) {
        summaryCards.innerHTML = `
            <div class="summary-card">
                <span class="summary-label">Logs Analyzed</span>
                <span class="summary-value info">${(data.summary.total_requests || 0).toLocaleString()}</span>
            </div>
            <div class="summary-card">
                <span class="summary-label">Attackers Blocked</span>
                <span class="summary-value ${data.summary.malicious_ips.length > 0 ? 'warning' : 'safe'}">${data.summary.malicious_ips.length}</span>
            </div>
            <div class="summary-card">
                <span class="summary-label">Critical Threats</span>
                <span class="summary-value ${data.summary.critical_threats > 0 ? 'danger' : 'safe'}">${data.summary.critical_threats || 0}</span>
            </div>
            <div class="summary-card">
                <span class="summary-label">Safety Score</span>
                <span class="summary-value ${getScoreClass(data.scorecard.safety_score)}">${data.scorecard.safety_score !== undefined ? data.scorecard.safety_score : 100}%</span>
            </div>
        `;

        threatsGrid.innerHTML = '';

        if (!data.threats || data.threats.length === 0) {
            threatsGrid.innerHTML = `
                <div class="threat-card safe" style="grid-column: 1 / -1; align-items: center; text-align: center; padding: 60px 20px;">
                    <h2 style="margin-bottom: 10px;">Looking Good!</h2>
                    <p style="color: var(--text-secondary);">No threats detected. Your site appears secure.</p>
                </div>
            `;
            return;
        }

        data.threats.forEach((threat, index) => {
            const sevClass = getSeverityClass(threat.severity);
            const card = document.createElement('div');
            card.className = `threat-card ${sevClass}`;
            card.style.animation = `slideUpFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.15}s both`;

            card.innerHTML = `
                <div class="card-header">
                    <div class="threat-icon-wrapper" style="font-size:2rem; width:auto; height:auto;">${threat.title ? threat.title.split(' ')[0] : '⚠️'}</div>
                    <div style="flex:1;">
                         <h3 class="card-title">${threat.title || threat.attack_type}</h3>
                    </div>
                </div>
                <p class="card-desc" style="font-size:1.1rem; line-height:1.5;">${threat.explanation}</p>
                <div class="threat-details" style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:12px; border-radius:8px;">
                    <div class="severity-badge ${sevClass}" style="position:static;">
                        <span class="badge-dot"></span>
                        ${threat.severity || 'Threat'}
                    </div>
                    <div class="detail-row" style="margin:0;">
                        <span class="detail-value ip" style="font-size:0.9rem; color:var(--text-secondary);">🕵️ ${threat.attack_type} (${threat.attacker_ip})</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Attempts</span>
                        <span class="detail-value">${threat.request_count}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Target</span>
                        <span class="detail-value">${threat.what_they_tried}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn btn-fix" data-index="${index}">
                        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Generate Protection
                    </button>
                </div>
            `;
            threatsGrid.appendChild(card);
        });

        document.querySelectorAll('.btn-fix').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.currentTarget.getAttribute('data-index');
                generateFix(data.threats[index]);
            });
        });

        // Wire up Anti-Gravity Config button
        const agBtn = document.getElementById('antigravityBtn');
        if (agBtn) {
            agBtn.addEventListener('click', () => {
                generateAntigravityConfig();
            });
        }
    }

    function getScoreClass(score) {
        if (score >= 80) return 'safe';
        if (score >= 50) return 'warning';
        return 'danger';
    }

    // =====================================================
    // BUG FIX 2: renderScorecard now waits for the section
    // to be visible before animating the arc + score number.
    // Previously the arc query ran before display:block so
    // the animation never fired → score showed 0.
    // =====================================================
    function renderScorecard() {
        if (!currentData || !currentData.scorecard) return;

        const card = currentData.scorecard;
        const target = Number(card.safety_score) || Number(card.score) || 0;

        scorecardContainer.setAttribute('data-vibe', card.vibe || 'warning');

        scorecardContainer.innerHTML = `
            <div class="scorecard-content">
                <div class="scorecard-header">
                    <h2 class="score-headline">${card.headline}</h2>
                    <p class="score-summary">${card.summary}</p>
                </div>

                <div class="score-circle">
                    <svg class="score-svg" viewBox="0 0 200 200" style="position:absolute;top:-4px;left:-4px;width:200px;height:200px;transform:rotate(-90deg);overflow:visible;">
                        <circle cx="100" cy="100" r="96" fill="none" class="score-arc" id="scoreArc"
                            style="stroke:currentColor;stroke-width:8;stroke-dasharray:603.18;stroke-dashoffset:603.18;transition:stroke-dashoffset 1.2s ease-out;"></circle>
                    </svg>
                    <div class="score-number" id="scoreNumber" style="position:relative;z-index:1;">0</div>
                    <div class="score-label" style="position:relative;z-index:1;">Safety Score</div>
                    <div class="score-grade">${card.grade}</div>
                </div>

                <div class="score-stats">
                    <div class="score-stat-item">
                        <span class="score-stat-val">${card.stats.total_requests.toLocaleString()}</span>
                        <span class="score-stat-label">Requests</span>
                    </div>
                    <div class="score-stat-item">
                        <span class="score-stat-val" style="color:var(--severity-critical)">${card.stats.threats_found}</span>
                        <span class="score-stat-label">Threats Stopped</span>
                    </div>
                    <div class="score-stat-item">
                        <span class="score-stat-val" style="color:var(--accent)">${card.stats.malicious_ips}</span>
                        <span class="score-stat-label">Bad Actors</span>
                    </div>
                </div>

                <div class="score-insights">
                    <div class="insight-item">
                        <div class="insight-label">Main Villain</div>
                        <div class="insight-text">${card.top_concern}</div>
                    </div>
                    <div class="insight-item">
                        <div class="insight-label">Top Threat Type</div>
                        <div class="insight-text">${card.fun_stat}</div>
                    </div>
                    <div class="insight-item">
                        <div class="insight-label">Next Step</div>
                        <div class="insight-text" style="color:var(--severity-safe);font-weight:500;">➔ ${card.recommendation}</div>
                    </div>
                </div>

                <div class="scorecard-actions no-print">
                    <button class="btn btn-primary" id="downloadReportBtn">Download Report</button>
                    <button class="btn btn-ghost" id="backToResultsBtn">Back to Details</button>
                </div>
            </div>
        `;

        document.getElementById('backToResultsBtn').addEventListener('click', () => {
            showSection('results');
        });

        // =====================================================
        // FIXED: Download button now generates an actual PDF
        // and saves it directly to Downloads folder instead
        // of opening the browser print dialog.
        // =====================================================
        document.getElementById('downloadReportBtn').addEventListener('click', () => {
            generatePDFReport(card, target);
        });

        // Wait for DOM paint before animating — this is the key fix for score = 0
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const numEl = document.getElementById('scoreNumber');
                const arcEl = document.getElementById('scoreArc');

                if (arcEl) {
                    const circumference = 603.18;
                    arcEl.style.strokeDashoffset = circumference - (circumference * target / 100);
                }

                if (numEl) {
                    if (target === 0) {
                        numEl.textContent = '0';
                        return;
                    }
                    let current = 0;
                    const inc = Math.max(target / 40, 1);
                    const timer = setInterval(() => {
                        current += inc;
                        if (current >= target) {
                            current = target;
                            clearInterval(timer);
                        }
                        numEl.textContent = Math.floor(current);
                    }, 25);
                }
            });
        });
    }

    // =====================================================
    // PDF Report Generator — direct download, no print dialog
    // =====================================================
    function generatePDFReport(card, score) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const margin = 20;
        const usable = pw - margin * 2;
        let y = margin;

        // --- Color palette ---
        const darkBg   = [5, 5, 8];
        const surface  = [16, 17, 26];
        const accent   = [0, 212, 255];
        const critical = [255, 51, 102];
        const safe     = [0, 255, 136];
        const medium   = [255, 170, 0];
        const white    = [240, 240, 245];
        const muted    = [136, 136, 170];

        // --- Background ---
        doc.setFillColor(...darkBg);
        doc.rect(0, 0, pw, ph, 'F');

        // --- Header bar ---
        doc.setFillColor(...surface);
        doc.roundedRect(margin, y, usable, 24, 4, 4, 'F');
        doc.setFontSize(18);
        doc.setTextColor(...accent);
        doc.text('ClearSight.ai', margin + 8, y + 15);
        doc.setFontSize(10);
        doc.setTextColor(...muted);
        const date = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
        doc.text(`Security Report — ${date}`, pw - margin - 8, y + 15, { align: 'right' });
        y += 34;

        // --- Title ---
        doc.setFontSize(22);
        doc.setTextColor(...white);
        doc.text(card.headline || 'Security Report', margin, y);
        y += 10;
        doc.setFontSize(11);
        doc.setTextColor(...muted);
        const summaryLines = doc.splitTextToSize(card.summary || '', usable);
        doc.text(summaryLines, margin, y);
        y += summaryLines.length * 6 + 8;

        // --- Score section ---
        doc.setFillColor(...surface);
        doc.roundedRect(margin, y, usable, 38, 4, 4, 'F');
        doc.setFontSize(42);
        const scoreColor = score >= 80 ? safe : score >= 50 ? medium : critical;
        doc.setTextColor(...scoreColor);
        doc.text(`${score}`, margin + 22, y + 28);
        doc.setFontSize(12);
        doc.setTextColor(...muted);
        doc.text('SAFETY SCORE', margin + 48, y + 18);

        // Grade badge
        const gradeText = card.grade || 'F';
        doc.setFillColor(...scoreColor);
        doc.roundedRect(margin + 48, y + 22, 18, 10, 3, 3, 'F');
        doc.setFontSize(12);
        doc.setTextColor(...darkBg);
        doc.text(gradeText, margin + 57, y + 30, { align: 'center' });

        // Stats on the right
        const stats = [
            { label: 'REQUESTS', val: String(card.stats?.total_requests || 0), color: white },
            { label: 'THREATS', val: String(card.stats?.threats_found || 0), color: critical },
            { label: 'BAD ACTORS', val: String(card.stats?.malicious_ips || 0), color: accent }
        ];
        const statX = pw - margin - 10;
        stats.forEach((s, i) => {
            const sx = statX - (stats.length - 1 - i) * 40;
            doc.setFontSize(16);
            doc.setTextColor(...s.color);
            doc.text(s.val, sx, y + 18, { align: 'center' });
            doc.setFontSize(7);
            doc.setTextColor(...muted);
            doc.text(s.label, sx, y + 26, { align: 'center' });
        });
        y += 48;

        // --- Divider ---
        doc.setDrawColor(...muted);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pw - margin, y);
        y += 10;

        // --- Threat Breakdown ---
        doc.setFontSize(14);
        doc.setTextColor(...accent);
        doc.text('Threat Breakdown', margin, y);
        y += 8;

        if (currentData && currentData.threats) {
            // Table header
            doc.setFillColor(20, 22, 35);
            doc.roundedRect(margin, y, usable, 8, 2, 2, 'F');
            doc.setFontSize(7);
            doc.setTextColor(...muted);
            doc.text('THREAT', margin + 4, y + 5.5);
            doc.text('SEVERITY', margin + 80, y + 5.5);
            doc.text('IP ADDRESS', margin + 108, y + 5.5);
            doc.text('ATTEMPTS', usable + margin - 4, y + 5.5, { align: 'right' });
            y += 10;

            currentData.threats.forEach((t, idx) => {
                if (y > ph - 30) {
                    doc.addPage();
                    doc.setFillColor(...darkBg);
                    doc.rect(0, 0, pw, ph, 'F');
                    y = margin;
                }

                // Alternating row bg
                if (idx % 2 === 0) {
                    doc.setFillColor(12, 13, 20);
                    doc.rect(margin, y - 1, usable, 9, 'F');
                }

                doc.setFontSize(8);
                doc.setTextColor(...white);
                const title = (t.title || t.attack_type || 'Unknown').substring(0, 40);
                doc.text(title, margin + 4, y + 5);

                const sev = (t.severity || 'medium').toLowerCase();
                const sevColor = sev === 'critical' ? critical : sev === 'medium' ? medium : accent;
                doc.setTextColor(...sevColor);
                doc.text(sev.toUpperCase(), margin + 80, y + 5);

                doc.setTextColor(...accent);
                doc.text(t.source_ip || '-', margin + 108, y + 5);

                doc.setTextColor(...white);
                doc.text(String(t.count || t.occurrences || 1), usable + margin - 4, y + 5, { align: 'right' });
                y += 9;
            });
        }
        y += 8;

        // --- Insights Section ---
        if (y > ph - 60) {
            doc.addPage();
            doc.setFillColor(...darkBg);
            doc.rect(0, 0, pw, ph, 'F');
            y = margin;
        }

        doc.setDrawColor(...muted);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pw - margin, y);
        y += 10;

        doc.setFontSize(14);
        doc.setTextColor(...accent);
        doc.text('Security Insights', margin, y);
        y += 10;

        const insights = [
            { label: 'Biggest Concern', text: card.top_concern },
            { label: 'Fun Fact', text: card.fun_stat },
            { label: 'Next Step', text: card.recommendation }
        ];
        insights.forEach(ins => {
            if (!ins.text) return;
            if (y > ph - 25) {
                doc.addPage();
                doc.setFillColor(...darkBg);
                doc.rect(0, 0, pw, ph, 'F');
                y = margin;
            }
            doc.setFontSize(8);
            doc.setTextColor(...accent);
            doc.text(ins.label.toUpperCase(), margin, y);
            y += 5;
            doc.setFontSize(10);
            doc.setTextColor(...white);
            const lines = doc.splitTextToSize(ins.text, usable);
            doc.text(lines, margin, y);
            y += lines.length * 5.5 + 6;
        });

        // --- Footer ---
        y = ph - 12;
        doc.setDrawColor(30, 30, 50);
        doc.setLineWidth(0.2);
        doc.line(margin, y - 4, pw - margin, y - 4);
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text('Generated by ClearSight.ai Security Dashboard', margin, y);
        doc.text('Confidential — Do Not Distribute', pw - margin, y, { align: 'right' });

        // --- Save ---
        doc.save('Security_Report_ClearSight.pdf');
    }

    // --- Modal & Protection Logic ---
    async function generateFix(threat) {
        modalThreatTitle.textContent = `Fixing: ${threat.title || threat.attack_type}`;
        modalBody.innerHTML = `
            <div class="modal-loader">
                <div class="spinner"></div>
                <p>Gemini is generating firewall rules specifically for ${threat.attacker_ip}...</p>
            </div>
        `;
        modal.classList.add('active');

        try {
            const response = await fetch(`${API_BASE}/generate-fix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(threat)
            });

            if (!response.ok) throw new Error('API Error');

            const fix = await response.json();

            // Structure the modal first
            modalBody.innerHTML = `
                <div class="fix-container">
                    <div class="fix-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                        <span class="fix-title">Generated Protection</span>
                        <span class="fix-status" id="fixStatusTag" style="display:none;color:var(--severity-safe);align-items:center;gap:6px;font-size:0.9rem;">
                            Protection Ready ✅
                        </span>
                    </div>
                    <div class="fix-content" style="background:#0a0a0f;padding:20px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);position:relative;">
                        <button class="copy-btn copy-single-btn" title="Copy Code">📋</button>
                        <pre style="margin:0;font-family:var(--font-mono);font-size:0.9rem;white-space:pre-wrap;color:var(--severity-safe);line-height:1.5;"><code id="typewriterTarget"></code></pre>
                    </div>
                    <div class="fix-explanation" style="margin-top:20px;padding:15px;background:var(--bg-surface);border-radius:8px;font-size:0.95rem;color:var(--text-secondary);">
                        ${fix.explanation}
                    </div>
                </div>
            `;

            // Prepare text for typing effect
            let codeText = '';
            if (fix.iptables) codeText += `# IPTABLES FIREWALL\n${fix.iptables}\n\n`;
            if (fix.htaccess) codeText += `# APACHE .HTACCESS\n${fix.htaccess}\n\n`;
            if (fix.cloudflare) codeText += `# CLOUDFLARE WAF\n${fix.cloudflare}\n`;
            if (!codeText.trim()) codeText = "# Protection modules generated successfully.";

            const typeTarget = document.getElementById('typewriterTarget');
            const statusTag = document.getElementById('fixStatusTag');
            
            // Fast typing animation
            let i = 0;
            const typingInterval = setInterval(() => {
                typeTarget.textContent += codeText.charAt(i);
                i++;
                if (i >= codeText.length) {
                    clearInterval(typingInterval);
                    statusTag.style.display = 'flex';
                }
            }, 10); // Very fast for demo

            const copyBtn = modalBody.querySelector('.copy-single-btn');
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(typeTarget.textContent);
                const original = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ Copied!';
                setTimeout(() => { copyBtn.innerHTML = original; }, 2000);
            });

        } catch (error) {
            modalBody.innerHTML = `
                <div style="color:var(--severity-critical);text-align:center;padding:40px 0;">
                    <h3>Failed to generate rules</h3>
                    <p>Please try again or check server connection.</p>
                </div>
            `;
        }
    }

    function renderFixRules(rules, threat) {
        let checklistHtml = '';
        if (rules.checklist && rules.checklist.length) {
            rules.checklist.forEach(item => {
                checklistHtml += `
                    <li class="checklist-item">
                        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>${item}</span>
                    </li>
                `;
            });
        }

        modalBody.innerHTML = `
            <p class="protection-explanation">${rules.explanation}</p>
            <div class="tabs-header">
                <button class="tab-btn active" data-tab="cloudflare">Cloudflare</button>
                <button class="tab-btn" data-tab="iptables">Linux (iptables)</button>
                <button class="tab-btn" data-tab="htaccess">Apache (.htaccess)</button>
            </div>
            <div class="tab-content active" id="tab-cloudflare">
                <div class="code-block-wrapper">
                    <button class="copy-btn">Copy</button>
                    <div class="code-block">${rules.cloudflare}</div>
                </div>
            </div>
            <div class="tab-content" id="tab-iptables">
                <div class="code-block-wrapper">
                    <button class="copy-btn">Copy</button>
                    <div class="code-block">${rules.iptables}</div>
                </div>
            </div>
            <div class="tab-content" id="tab-htaccess">
                <div class="code-block-wrapper">
                    <button class="copy-btn">Copy</button>
                    <div class="code-block">${rules.htaccess}</div>
                </div>
            </div>
            <h4 class="checklist-title">Action Checklist</h4>
            <ul class="checklist">${checklistHtml}</ul>
        `;

        modalBody.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modalBody.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                modalBody.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
            });
        });

        modalBody.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const codeBlock = e.target.nextElementSibling;
                navigator.clipboard.writeText(codeBlock.textContent);
                const orig = e.target.textContent;
                e.target.textContent = 'Copied!';
                e.target.style.background = 'var(--severity-safe)';
                e.target.style.color = '#000';
                setTimeout(() => {
                    e.target.textContent = orig;
                    e.target.style.background = '';
                    e.target.style.color = '';
                }, 2000);
            });
        });
    }

    modalClose.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    antigravityModalClose.addEventListener('click', () => antigravityModal.classList.remove('active'));
    antigravityModal.addEventListener('click', (e) => { if (e.target === antigravityModal) antigravityModal.classList.remove('active'); });

    // =====================================================
    // BUG FIX 2 (continued): viewScorecardBtn now calls
    // showSection('scorecard') which properly hides results
    // before showing scorecard — no more section overlap.
    // =====================================================
    viewScorecardBtn.addEventListener('click', () => {
        renderScorecard();
        showSection('scorecard');
    });

    // --- Anti-Gravity Config ---
    async function generateAntigravityConfig() {
        if (!currentData) return;

        antigravityModalBody.innerHTML = `
            <div class="modal-loader">
                <div class="spinner"></div>
                <p class="ag-loading-text">Anti-Gravity Engine is generating your security configuration...</p>
                <p class="ag-loading-sub">Analyzing ${currentData.threats.length} threats across ${currentData.summary.malicious_ips.length} attackers</p>
            </div>
        `;
        antigravityModal.classList.add('active');

        try {
            const response = await fetch(`${API_BASE}/generate-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    threats: currentData.threats,
                    summary: currentData.summary
                })
            });
            if (!response.ok) throw new Error('API Error');
            const config = await response.json();
            renderAntigravityConfig(config);
        } catch (error) {
            console.error('Anti-Gravity config error:', error);
            antigravityModalBody.innerHTML = `
                <div style="color:var(--severity-critical);text-align:center;padding:40px 0;">
                    <h3>Configuration generation failed</h3>
                    <p>Please try again or check server connection.</p>
                </div>
            `;
        }
    }

    function renderAntigravityConfig(config) {
        const ipRows = (config.ip_blocklist?.blocked_ips || []).map(ip => `
            <tr class="ag-ip-row">
                <td class="ag-ip-addr">${ip.ip}</td>
                <td><span class="severity-badge ${ip.risk_level === 'Critical' ? 'critical' : 'medium'}">
                    <span class="badge-dot"></span>${ip.risk_level}
                </span></td>
                <td>${ip.threat_type}</td>
                <td>${ip.reason}</td>
            </tr>
        `).join('');

        const dpiRows = (config.dpi_rules || []).map((rule, i) => `
            <div class="ag-dpi-rule">
                <div class="ag-dpi-header">
                    <span class="ag-dpi-name">${rule.name}</span>
                    <span class="ag-dpi-action ${rule.action === 'DROP' ? 'drop' : 'reject'}">${rule.action}</span>
                </div>
                <div class="ag-dpi-pattern"><code>${rule.pattern}</code></div>
                <div class="ag-dpi-desc">${rule.description}</div>
                <div class="ag-dpi-type">Targets: ${rule.attack_type}</div>
            </div>
        `).join('');

        const validationRows = (config.request_validation || []).map(rule => `
            <div class="ag-val-rule">
                <div class="ag-val-header">
                    <span class="ag-val-name">${rule.rule_name}</span>
                    <span class="ag-val-target">${rule.target}</span>
                </div>
                <div class="ag-val-validation">${rule.validation}</div>
                <div class="ag-val-desc">${rule.description}</div>
            </div>
        `).join('');

        antigravityModalBody.innerHTML = `
            <div class="ag-config-container">
                <!-- Summary Banner -->
                <div class="ag-summary-banner">
                    <div class="ag-summary-text">${config.summary}</div>
                    <div class="ag-score-transition">
                        <div class="ag-score-before">
                            <span class="ag-score-label">Current</span>
                            <span class="ag-score-val danger">${currentData.scorecard?.safety_score || 0}</span>
                        </div>
                        <svg class="ag-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                        <div class="ag-score-after">
                            <span class="ag-score-label">After Config</span>
                            <span class="ag-score-val safe">${config.safety_score_after || 92}</span>
                        </div>
                        <div class="ag-grade-after">
                            <span class="ag-grade-badge">${config.grade_after || 'A'}</span>
                        </div>
                    </div>
                </div>

                <!-- Section Tabs -->
                <div class="ag-tabs">
                    <button class="ag-tab active" data-agtab="ips">🛡️ IP Blocklist (${config.ip_blocklist?.blocked_ips?.length || 0})</button>
                    <button class="ag-tab" data-agtab="dpi">🔍 DPI Rules (${config.dpi_rules?.length || 0})</button>
                    <button class="ag-tab" data-agtab="validation">✅ Validation (${config.request_validation?.length || 0})</button>
                    <button class="ag-tab" data-agtab="firewall">🔥 Firewall</button>
                </div>

                <!-- IP Blocklist -->
                <div class="ag-tab-content active" id="agtab-ips">
                    <div class="ag-section-header">
                        <h4>IP Reputation Filtering</h4>
                        <p>Automatically block identified bad actors and malicious data center IPs</p>
                    </div>
                    <div class="ag-table-wrapper">
                        <table class="ag-table">
                            <thead><tr><th>IP Address</th><th>Risk</th><th>Threat Type</th><th>Reason</th></tr></thead>
                            <tbody>${ipRows}</tbody>
                        </table>
                    </div>
                    <div class="ag-code-sections">
                        <div class="ag-code-group">
                            <h5>iptables</h5>
                            <div class="code-block-wrapper"><button class="copy-btn">Copy</button>
                                <div class="code-block">${config.ip_blocklist?.iptables_rules || ''}</div>
                            </div>
                        </div>
                        <div class="ag-code-group">
                            <h5>Nginx</h5>
                            <div class="code-block-wrapper"><button class="copy-btn">Copy</button>
                                <div class="code-block">${config.ip_blocklist?.nginx_deny || ''}</div>
                            </div>
                        </div>
                        <div class="ag-code-group">
                            <h5>.htaccess</h5>
                            <div class="code-block-wrapper"><button class="copy-btn">Copy</button>
                                <div class="code-block">${config.ip_blocklist?.htaccess_deny || ''}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- DPI Rules -->
                <div class="ag-tab-content" id="agtab-dpi">
                    <div class="ag-section-header">
                        <h4>Deep Packet Inspection Rules</h4>
                        <p>Scan incoming request patterns to identify and drop attack payloads</p>
                    </div>
                    <div class="ag-dpi-list">${dpiRows}</div>
                </div>

                <!-- Request Validation -->
                <div class="ag-tab-content" id="agtab-validation">
                    <div class="ag-section-header">
                        <h4>Request Validation & Hardening</h4>
                        <p>Strict schema validation to neutralize critical threats</p>
                    </div>
                    <div class="ag-val-list">${validationRows}</div>
                </div>

                <!-- Firewall Config -->
                <div class="ag-tab-content" id="agtab-firewall">
                    <div class="ag-section-header">
                        <h4>Auto-Remediation Firewall Rules</h4>
                        <p>Complete firewall configurations to stop suspicious requests at the network layer</p>
                    </div>
                    <div class="ag-firewall-tabs">
                        <button class="ag-fw-tab active" data-fwtab="iptables">Linux (iptables)</button>
                        <button class="ag-fw-tab" data-fwtab="cloudflare">Cloudflare WAF</button>
                        <button class="ag-fw-tab" data-fwtab="modsecurity">ModSecurity</button>
                    </div>
                    <div class="ag-fw-content active" id="fwtab-iptables">
                        <div class="code-block-wrapper"><button class="copy-btn">Copy</button>
                            <pre class="code-block">${config.firewall_config?.iptables || ''}</pre>
                        </div>
                    </div>
                    <div class="ag-fw-content" id="fwtab-cloudflare">
                        <div class="code-block-wrapper"><button class="copy-btn">Copy</button>
                            <div class="code-block">${config.firewall_config?.cloudflare_waf || ''}</div>
                        </div>
                    </div>
                    <div class="ag-fw-content" id="fwtab-modsecurity">
                        <div class="code-block-wrapper"><button class="copy-btn">Copy</button>
                            <pre class="code-block">${config.firewall_config?.modsecurity || ''}</pre>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Wire up tabs
        antigravityModalBody.querySelectorAll('.ag-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                antigravityModalBody.querySelectorAll('.ag-tab').forEach(b => b.classList.remove('active'));
                antigravityModalBody.querySelectorAll('.ag-tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`agtab-${e.target.dataset.agtab}`).classList.add('active');
            });
        });

        // Wire up firewall sub-tabs
        antigravityModalBody.querySelectorAll('.ag-fw-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                antigravityModalBody.querySelectorAll('.ag-fw-tab').forEach(b => b.classList.remove('active'));
                antigravityModalBody.querySelectorAll('.ag-fw-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`fwtab-${e.target.dataset.fwtab}`).classList.add('active');
            });
        });

        // Wire up copy buttons
        antigravityModalBody.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const codeBlock = e.target.nextElementSibling;
                navigator.clipboard.writeText(codeBlock.textContent);
                const orig = e.target.textContent;
                e.target.textContent = 'Copied!';
                e.target.style.background = 'var(--severity-safe)';
                e.target.style.color = '#000';
                setTimeout(() => {
                    e.target.textContent = orig;
                    e.target.style.background = '';
                    e.target.style.color = '';
                }, 2000);
            });
        });
    }

    scanAgainBtn.addEventListener('click', () => {
        currentData = null;
        fileInput.value = '';
        logTextarea.value = '';
        uploadZone.innerHTML = `
            <div class="upload-icon">
                <svg viewBox="0 0 64 64" fill="none">
                    <rect x="8" y="16" width="48" height="40" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
                    <path d="M32 28 L32 48" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M24 36 L32 28 L40 36" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M20 16 L20 12 A4 4 0 0 1 24 8 L40 8 A4 4 0 0 1 44 12 L44 16" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
            </div>
            <h3 class="upload-title">Drop your .log file here</h3>
            <p class="upload-desc">or click to browse • Supports Apache & Nginx logs</p>
        `;
        uploadZone.style.borderColor = '';
        sampleBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/>
            </svg>
            ⚡ Try Sample Log
        `;
        sampleBtn.disabled = false;
        showSection('hero');
        setStatus('Ready to scan', 'safe');
    });
});
