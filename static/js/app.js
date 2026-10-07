/**
 * EWURC Photo Branding Studio - Client Application
 */

document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        currentFile: null,
        originalUrl: null,
        brandedBlob: null,
        brandedUrl: null,
        isProcessing: false,
        activeTab: 'single',
        viewMode: 'split',
        batchFiles: [], // [{ id, file, status, originalUrl, brandedBlob, brandedUrl }]
        debounceTimer: null,
        sliderActive: false
    };

    // DOM Elements - Navigation & Tabs
    const tabSingleBtn = document.getElementById('tab-single-btn');
    const tabBatchBtn = document.getElementById('tab-batch-btn');
    const tabSingleContent = document.getElementById('tab-single');
    const tabBatchContent = document.getElementById('tab-batch');
    const batchBadge = document.getElementById('batch-badge');

    // DOM Elements - Single Studio
    const singleDropzone = document.getElementById('single-dropzone');
    const singleFileInput = document.getElementById('single-file-input');
    const previewContainer = document.getElementById('preview-container');
    const btnClearSingle = document.getElementById('btn-clear-single');
    const brandingForm = document.getElementById('branding-form');
    const btnResetDefaults = document.getElementById('btn-reset-defaults');
    const autoPreviewToggle = document.getElementById('auto-preview-toggle');
    const btnReprocess = document.getElementById('btn-reprocess');
    const btnDownloadHd = document.getElementById('btn-download-hd');
    
    // Sliders & Inputs
    const centerTextInput = document.getElementById('center-text-input');
    const fontSelect = document.getElementById('font-select');
    const logoScaleSlider = document.getElementById('logo-scale-slider');
    const logoScaleVal = document.getElementById('logo-scale-val');
    const fontScaleSlider = document.getElementById('font-scale-slider');
    const fontScaleVal = document.getElementById('font-scale-val');
    const gradientHeightSlider = document.getElementById('gradient-height-slider');
    const gradientHeightVal = document.getElementById('gradient-height-val');
    const gradientOpacitySlider = document.getElementById('gradient-opacity-slider');
    const gradientOpacityVal = document.getElementById('gradient-opacity-val');
    const paddingSlider = document.getElementById('padding-slider');
    const paddingVal = document.getElementById('padding-val');
    const textOffsetSlider = document.getElementById('text-offset-slider');
    const textOffsetVal = document.getElementById('text-offset-val');
    const outputFormatSelect = document.getElementById('output-format-select');
    const qualitySelect = document.getElementById('quality-select');
    const textChips = document.querySelectorAll('.chip[data-preset]');

    // Preview Elements
    const previewFilename = document.getElementById('preview-filename');
    const previewResolution = document.getElementById('preview-resolution');
    const previewFilesize = document.getElementById('preview-filesize');
    const previewDuration = document.getElementById('preview-duration');
    const splitComparisonBox = document.getElementById('split-comparison-box');
    const sideComparisonBox = document.getElementById('side-comparison-box');
    const brandedClipLayer = document.getElementById('branded-clip-layer');
    const sliderHandle = document.getElementById('slider-handle');
    const imgOriginal = document.getElementById('img-original');
    const imgBranded = document.getElementById('img-branded');
    const imgSideOriginal = document.getElementById('img-side-original');
    const imgSideBranded = document.getElementById('img-side-branded');
    const processingSpinner = document.getElementById('processing-spinner');
    const spinnerText = document.getElementById('spinner-text');

    // View Mode Buttons
    const btnModeSplit = document.getElementById('btn-mode-split');
    const btnModeSide = document.getElementById('btn-mode-side');
    const btnModeBranded = document.getElementById('btn-mode-branded');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    // Batch Elements
    const batchDropzone = document.getElementById('batch-dropzone');
    const batchFileInput = document.getElementById('batch-file-input');
    const batchGrid = document.getElementById('batch-grid');
    const btnStartBatch = document.getElementById('btn-start-batch');
    const btnDownloadZip = document.getElementById('btn-download-zip');
    const btnBatchClear = document.getElementById('btn-batch-clear');
    const batchProgressBox = document.getElementById('batch-progress-box');
    const batchProgressText = document.getElementById('batch-progress-text');
    const batchProgressPercent = document.getElementById('batch-progress-percent');
    const batchProgressFill = document.getElementById('batch-progress-fill');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    /* ========================================================================
       Toast Notification Utility
       ======================================================================== */
    function showToast(message, type = 'info', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }, duration);
    }

    /* ========================================================================
       Tab Navigation
       ======================================================================== */
    function switchTab(tabName) {
        state.activeTab = tabName;
        if (tabName === 'single') {
            tabSingleBtn.classList.add('active');
            tabBatchBtn.classList.remove('active');
            tabSingleContent.classList.add('active');
            tabBatchContent.classList.remove('active');
        } else {
            tabBatchBtn.classList.add('active');
            tabSingleBtn.classList.remove('active');
            tabBatchContent.classList.add('active');
            tabSingleContent.classList.remove('active');
        }
    }

    tabSingleBtn.addEventListener('click', () => switchTab('single'));
    tabBatchBtn.addEventListener('click', () => switchTab('batch'));

    /* ========================================================================
       Slider Controls & Value Bindings
       ======================================================================== */
    function updateControlLabels() {
        logoScaleVal.textContent = Math.round(logoScaleSlider.value * 100) + '%';
        fontScaleVal.textContent = (fontScaleSlider.value * 100).toFixed(1) + '%';
        gradientHeightVal.textContent = Math.round(gradientHeightSlider.value * 100) + '%';
        gradientOpacityVal.textContent = gradientOpacitySlider.value;
        paddingVal.textContent = paddingSlider.value + 'px';
        
        const offsetVal = parseInt(textOffsetSlider.value, 10);
        textOffsetVal.textContent = offsetVal === 0 ? 'Auto' : (offsetVal > 0 ? `+${offsetVal}px` : `${offsetVal}px`);
    }

    // Attach slider event listeners
    [logoScaleSlider, fontScaleSlider, gradientHeightSlider, gradientOpacitySlider, paddingSlider, textOffsetSlider].forEach(slider => {
        slider.addEventListener('input', () => {
            updateControlLabels();
            triggerDebouncedProcessing();
        });
    });

    centerTextInput.addEventListener('input', () => {
        // Unset chips active state if custom typed
        textChips.forEach(c => {
            if (c.getAttribute('data-preset') === centerTextInput.value.trim()) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });
        triggerDebouncedProcessing();
    });

    fontSelect.addEventListener('change', triggerDebouncedProcessing);
    outputFormatSelect.addEventListener('change', triggerDebouncedProcessing);
    qualitySelect.addEventListener('change', triggerDebouncedProcessing);

    // Quick text presets chips
    textChips.forEach(chip => {
        chip.addEventListener('click', () => {
            textChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            centerTextInput.value = chip.getAttribute('data-preset');
            triggerDebouncedProcessing();
        });
    });

    // Reset Defaults
    btnResetDefaults.addEventListener('click', () => {
        centerTextInput.value = "East West University Robotics Club";
        fontSelect.value = "industry";
        logoScaleSlider.value = 0.11;
        fontScaleSlider.value = 0.038;
        gradientHeightSlider.value = 0.25;
        gradientOpacitySlider.value = 185;
        paddingSlider.value = 35;
        textOffsetSlider.value = 0;
        outputFormatSelect.value = "auto";
        qualitySelect.value = "95";

        textChips.forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-preset') === centerTextInput.value);
        });

        updateControlLabels();
        showToast("Parameters reset to EWURC defaults", "info");
        triggerDebouncedProcessing(true);
    });

    function triggerDebouncedProcessing(immediate = false) {
        if (!state.currentFile) return;
        if (!autoPreviewToggle.checked && !immediate) return;

        clearTimeout(state.debounceTimer);
        const delay = immediate ? 0 : 250;
        state.debounceTimer = setTimeout(() => {
            processSingleImage(false);
        }, delay);
    }

    btnReprocess.addEventListener('click', () => {
        if (state.currentFile) {
            processSingleImage(false);
        }
    });

    /* ========================================================================
       Single Image Upload & Handling
       ======================================================================== */
    singleDropzone.addEventListener('click', () => singleFileInput.click());

    singleFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadSingleFile(e.target.files[0]);
        }
    });

    // Drag and Drop
    ['dragenter', 'dragover'].forEach(name => {
        singleDropzone.addEventListener(name, (e) => {
            e.preventDefault();
            singleDropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        singleDropzone.addEventListener(name, (e) => {
            e.preventDefault();
            singleDropzone.classList.remove('dragover');
        });
    });

    singleDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
            loadSingleFile(e.dataTransfer.files[0]);
        }
    });

    // Global Clipboard Paste Support
    document.addEventListener('paste', (e) => {
        if (state.activeTab !== 'single') return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                if (blob) {
                    showToast("Pasted image from clipboard!", "info");
                    loadSingleFile(blob);
                    break;
                }
            }
        }
    });

    function loadSingleFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast("Please select a valid image file (JPG, PNG, WebP).", "error");
            return;
        }

        state.currentFile = file;
        previewFilename.textContent = file.name || "pasted_image.png";
        previewFilesize.textContent = formatBytes(file.size);

        if (state.originalUrl) {
            URL.revokeObjectURL(state.originalUrl);
        }
        state.originalUrl = URL.createObjectURL(file);
        
        // Measure dimensions
        const testImg = new Image();
        testImg.onload = () => {
            previewResolution.textContent = `${testImg.naturalWidth} \u00D7 ${testImg.naturalHeight}`;
        };
        testImg.src = state.originalUrl;

        imgOriginal.src = state.originalUrl;
        imgSideOriginal.src = state.originalUrl;

        singleDropzone.style.display = 'none';
        previewContainer.style.display = 'flex';

        // Auto process immediately
        processSingleImage(false);
    }

    btnClearSingle.addEventListener('click', () => {
        state.currentFile = null;
        if (state.originalUrl) URL.revokeObjectURL(state.originalUrl);
        if (state.brandedUrl) URL.revokeObjectURL(state.brandedUrl);
        state.originalUrl = null;
        state.brandedUrl = null;
        state.brandedBlob = null;

        imgOriginal.src = '';
        imgBranded.src = '';
        imgSideOriginal.src = '';
        imgSideBranded.src = '';
        singleFileInput.value = '';

        previewContainer.style.display = 'none';
        singleDropzone.style.display = 'flex';
    });

    /* ========================================================================
       Image Processing API Call
       ======================================================================== */
    async function processSingleImage(forDownload = false) {
        if (!state.currentFile || state.isProcessing) return;

        state.isProcessing = true;
        processingSpinner.style.display = 'flex';
        spinnerText.textContent = forDownload ? 'Preparing High-Res Download...' : 'Applying EWURC Branding...';
        const startTime = performance.now();

        try {
            const formData = new FormData();
            formData.append('file', state.currentFile);
            formData.append('center_text', centerTextInput.value);
            formData.append('font_choice', fontSelect.value);
            formData.append('logo_scale', logoScaleSlider.value);
            formData.append('font_scale', fontScaleSlider.value);
            formData.append('gradient_height_ratio', gradientHeightSlider.value);
            formData.append('gradient_max_opacity', gradientOpacitySlider.value);
            formData.append('padding', paddingSlider.value);

            const offsetVal = parseInt(textOffsetSlider.value, 10);
            if (offsetVal !== 0) {
                formData.append('text_offset_y', offsetVal);
            }

            formData.append('output_format', outputFormatSelect.value);
            formData.append('quality', qualitySelect.value);

            // In preview mode on very large images, ask for fast preview
            if (!forDownload) {
                formData.append('preview', 'true');
            }

            const response = await fetch('/api/process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ detail: 'Processing error' }));
                throw new Error(errData.detail || 'Failed to brand image');
            }

            const blob = await response.blob();
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            previewDuration.textContent = `${elapsed}s`;

            if (forDownload) {
                // Direct trigger download
                triggerBlobDownload(blob, getExportFilename());
                showToast("Download started!", "success");
            } else {
                // Update live preview
                if (state.brandedUrl) {
                    URL.revokeObjectURL(state.brandedUrl);
                }
                state.brandedBlob = blob;
                state.brandedUrl = URL.createObjectURL(blob);

                imgBranded.src = state.brandedUrl;
                imgSideBranded.src = state.brandedUrl;

                // Sync image dimensions from headers if present
                const w = response.headers.get('X-Image-Width');
                const h = response.headers.get('X-Image-Height');
                if (w && h) {
                    previewResolution.textContent = `${w} \u00D7 ${h}`;
                }
            }

        } catch (err) {
            console.error('Error during processing:', err);
            showToast(err.message || 'Error branding image', 'error');
        } finally {
            state.isProcessing = false;
            processingSpinner.style.display = 'none';
        }
    }

    function getExportFilename() {
        const origName = state.currentFile?.name || 'photo.jpg';
        const dotIdx = origName.lastIndexOf('.');
        const baseName = dotIdx !== -1 ? origName.substring(0, dotIdx) : origName;
        let ext = dotIdx !== -1 ? origName.substring(dotIdx) : '.jpg';

        if (outputFormatSelect.value === 'jpeg') ext = '.jpg';
        else if (outputFormatSelect.value === 'png') ext = '.png';
        else if (outputFormatSelect.value === 'webp') ext = '.webp';

        return `branded_${baseName}${ext}`;
    }

    function triggerBlobDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    btnDownloadHd.addEventListener('click', async () => {
        if (!state.currentFile) return;
        // Request full HD / original resolution output
        await processSingleImage(true);
    });

    /* ========================================================================
       Split Comparison Interactive Slider
       ======================================================================== */
    function setSplitPosition(percent) {
        percent = Math.max(0, Math.min(100, percent));
        sliderHandle.style.left = `${percent}%`;
        brandedClipLayer.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
    }

    function handleSliderMove(e) {
        if (!state.sliderActive) return;
        const rect = splitComparisonBox.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const offsetX = clientX - rect.left;
        const percent = (offsetX / rect.width) * 100;
        setSplitPosition(percent);
    }

    sliderHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.sliderActive = true;
    });

    splitComparisonBox.addEventListener('mousedown', (e) => {
        state.sliderActive = true;
        handleSliderMove(e);
    });

    window.addEventListener('mousemove', handleSliderMove);
    window.addEventListener('mouseup', () => {
        state.sliderActive = false;
    });

    // Touch support for mobile / tablets
    sliderHandle.addEventListener('touchstart', (e) => {
        state.sliderActive = true;
    }, { passive: true });

    window.addEventListener('touchmove', handleSliderMove, { passive: true });
    window.addEventListener('touchend', () => {
        state.sliderActive = false;
    });

    // View Modes
    btnModeSplit.addEventListener('click', () => {
        state.viewMode = 'split';
        btnModeSplit.classList.add('active');
        btnModeSide.classList.remove('active');
        btnModeBranded.classList.remove('active');

        splitComparisonBox.style.display = 'flex';
        sideComparisonBox.style.display = 'none';
        sliderHandle.style.display = 'block';
        setSplitPosition(50);
    });

    btnModeSide.addEventListener('click', () => {
        state.viewMode = 'side';
        btnModeSide.classList.add('active');
        btnModeSplit.classList.remove('active');
        btnModeBranded.classList.remove('active');

        splitComparisonBox.style.display = 'none';
        sideComparisonBox.style.display = 'grid';
    });

    btnModeBranded.addEventListener('click', () => {
        state.viewMode = 'branded';
        btnModeBranded.classList.add('active');
        btnModeSplit.classList.remove('active');
        btnModeSide.classList.remove('active');

        splitComparisonBox.style.display = 'flex';
        sideComparisonBox.style.display = 'none';
        sliderHandle.style.display = 'none';
        setSplitPosition(100);
    });

    // Fullscreen View
    btnFullscreen.addEventListener('click', () => {
        const compElem = document.getElementById('comparison-wrapper');
        if (!document.fullscreenElement) {
            compElem.requestFullscreen?.() || compElem.webkitRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        }
    });

    /* ========================================================================
       TAB 2: Batch Processing
       ======================================================================== */
    batchDropzone.addEventListener('click', () => batchFileInput.click());

    batchFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
            addBatchFiles(Array.from(e.target.files));
        }
    });

    // Drag & Drop for batch
    ['dragenter', 'dragover'].forEach(name => {
        batchDropzone.addEventListener(name, (e) => {
            e.preventDefault();
            batchDropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        batchDropzone.addEventListener(name, (e) => {
            e.preventDefault();
            batchDropzone.classList.remove('dragover');
        });
    });

    batchDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files) {
            addBatchFiles(Array.from(e.dataTransfer.files));
        }
    });

    function addBatchFiles(files) {
        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            showToast("No valid image files found.", "error");
            return;
        }

        imageFiles.forEach(file => {
            const id = 'batch_' + Math.random().toString(36).substring(2, 9);
            const originalUrl = URL.createObjectURL(file);
            state.batchFiles.push({
                id,
                file,
                status: 'ready', // 'ready', 'processing', 'done', 'error'
                originalUrl,
                brandedBlob: null,
                brandedUrl: null
            });
        });

        renderBatchGrid();
        updateBatchControls();
        showToast(`Added ${imageFiles.length} photos to batch queue`, "info");
    }

    function updateBatchControls() {
        const count = state.batchFiles.length;
        batchBadge.textContent = count;
        batchBadge.style.display = count > 0 ? 'inline-block' : 'none';

        btnStartBatch.disabled = count === 0;
        btnBatchClear.disabled = count === 0;

        const hasCompleted = state.batchFiles.some(f => f.status === 'done');
        btnDownloadZip.disabled = !hasCompleted;
    }

    function renderBatchGrid() {
        batchGrid.innerHTML = '';
        state.batchFiles.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'batch-item-card';
            card.id = `card_${item.id}`;

            let badgeHtml = '';
            if (item.status === 'ready') {
                badgeHtml = '<span class="badge badge-subtle">Ready</span>';
            } else if (item.status === 'processing') {
                badgeHtml = '<span class="badge badge-accent">Processing...</span>';
            } else if (item.status === 'done') {
                badgeHtml = '<span class="badge badge-success">Branded</span>';
            } else if (item.status === 'error') {
                badgeHtml = '<span class="badge" style="background:#7F1D1D;color:#FECACA;">Error</span>';
            }

            const displayUrl = item.brandedUrl || item.originalUrl;

            card.innerHTML = `
                <div class="batch-item-thumb">
                    <img src="${displayUrl}" alt="${item.file.name}" loading="lazy">
                    <div class="batch-item-badge">${badgeHtml}</div>
                </div>
                <div class="batch-item-info">
                    <div class="batch-item-name" title="${item.file.name}">${item.file.name}</div>
                    <div class="batch-item-meta">
                        <span>${formatBytes(item.file.size)}</span>
                        <span>#${index + 1}</span>
                    </div>
                </div>
                <div class="batch-item-actions">
                    <button type="button" class="btn btn-secondary btn-card btn-remove-item" data-id="${item.id}">Remove</button>
                    ${item.status === 'done' ? `
                        <button type="button" class="btn btn-primary btn-card btn-dl-item" data-id="${item.id}">Download</button>
                    ` : ''}
                </div>
            `;

            batchGrid.appendChild(card);
        });

        // Event listeners for individual items
        document.querySelectorAll('.btn-remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                removeBatchItem(id);
            });
        });

        document.querySelectorAll('.btn-dl-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const item = state.batchFiles.find(f => f.id === id);
                if (item && item.brandedBlob) {
                    triggerBlobDownload(item.brandedBlob, `branded_${item.file.name}`);
                }
            });
        });
    }

    function removeBatchItem(id) {
        const idx = state.batchFiles.findIndex(f => f.id === id);
        if (idx !== -1) {
            const item = state.batchFiles[idx];
            if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
            if (item.brandedUrl) URL.revokeObjectURL(item.brandedUrl);
            state.batchFiles.splice(idx, 1);
            renderBatchGrid();
            updateBatchControls();
        }
    }

    btnBatchClear.addEventListener('click', () => {
        state.batchFiles.forEach(item => {
            if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
            if (item.brandedUrl) URL.revokeObjectURL(item.brandedUrl);
        });
        state.batchFiles = [];
        renderBatchGrid();
        updateBatchControls();
        batchProgressBox.style.display = 'none';
        showToast("Batch queue cleared", "info");
    });

    // Process Batch
    btnStartBatch.addEventListener('click', async () => {
        const total = state.batchFiles.length;
        if (total === 0) return;

        btnStartBatch.disabled = true;
        btnBatchClear.disabled = true;
        batchProgressBox.style.display = 'flex';

        let processedCount = 0;

        for (let i = 0; i < total; i++) {
            const item = state.batchFiles[i];
            item.status = 'processing';
            renderBatchGrid();

            batchProgressText.textContent = `Processing ${i + 1} of ${total}: ${item.file.name}`;
            const pct = Math.round(((i) / total) * 100);
            batchProgressPercent.textContent = `${pct}%`;
            batchProgressFill.style.width = `${pct}%`;

            try {
                const formData = new FormData();
                formData.append('file', item.file);
                formData.append('center_text', centerTextInput.value);
                formData.append('font_choice', fontSelect.value);
                formData.append('logo_scale', logoScaleSlider.value);
                formData.append('font_scale', fontScaleSlider.value);
                formData.append('gradient_height_ratio', gradientHeightSlider.value);
                formData.append('gradient_max_opacity', gradientOpacitySlider.value);
                formData.append('padding', paddingSlider.value);
                formData.append('output_format', outputFormatSelect.value);
                formData.append('quality', qualitySelect.value);

                const offsetVal = parseInt(textOffsetSlider.value, 10);
                if (offsetVal !== 0) formData.append('text_offset_y', offsetVal);

                const response = await fetch('/api/process', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Failed');

                const blob = await response.blob();
                item.brandedBlob = blob;
                item.brandedUrl = URL.createObjectURL(blob);
                item.status = 'done';
                processedCount++;
            } catch (err) {
                console.error('Batch item error:', err);
                item.status = 'error';
            }

            renderBatchGrid();
        }

        // Complete
        batchProgressText.textContent = `Completed! ${processedCount} of ${total} images branded successfully.`;
        batchProgressPercent.textContent = `100%`;
        batchProgressFill.style.width = `100%`;

        btnStartBatch.disabled = false;
        btnBatchClear.disabled = false;
        updateBatchControls();
        showToast(`Batch completed: ${processedCount} photos ready!`, "success");
    });

    // Download All as ZIP (Server Endpoint)
    btnDownloadZip.addEventListener('click', async () => {
        if (state.batchFiles.length === 0) return;

        btnDownloadZip.disabled = true;
        const originalText = btnDownloadZip.innerHTML;
        btnDownloadZip.innerHTML = '<span>Creating ZIP Archive...</span>';

        try {
            const formData = new FormData();
            state.batchFiles.forEach(item => {
                formData.append('files', item.file);
            });
            formData.append('center_text', centerTextInput.value);
            formData.append('font_choice', fontSelect.value);
            formData.append('logo_scale', logoScaleSlider.value);
            formData.append('font_scale', fontScaleSlider.value);
            formData.append('gradient_height_ratio', gradientHeightSlider.value);
            formData.append('gradient_max_opacity', gradientOpacitySlider.value);
            formData.append('padding', paddingSlider.value);
            formData.append('output_format', outputFormatSelect.value);
            formData.append('quality', qualitySelect.value);

            const offsetVal = parseInt(textOffsetSlider.value, 10);
            if (offsetVal !== 0) formData.append('text_offset_y', offsetVal);

            showToast("Generating ZIP on server...", "info");

            const response = await fetch('/api/process-batch', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('ZIP generation failed');

            const zipBlob = await response.blob();
            triggerBlobDownload(zipBlob, 'ewurc_branded_photos.zip');
            showToast("ZIP download started!", "success");

        } catch (err) {
            console.error('ZIP error:', err);
            showToast("Failed to create ZIP package", "error");
        } finally {
            btnDownloadZip.disabled = false;
            btnDownloadZip.innerHTML = originalText;
        }
    });

    /* ========================================================================
       Utilities
       ======================================================================== */
    function formatBytes(bytes, decimals = 1) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Initialize labels
    updateControlLabels();
});
