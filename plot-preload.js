// Initialize expensive plots one at a time without Reveal unloading their frames.
const plotFrames = [...document.querySelectorAll('[data-plot-src]')];
function resizeVisiblePlots() {
    for (const frame of plotFrames) {
        if (frame.closest('section').classList.contains('present')) {
            frame.contentWindow.postMessage({type: 'fiber-plot-resize'}, '*');
        }
    }
}
function loadPlot(frame) {
    return new Promise(resolve => {
        const wrapper = frame.closest('.plot-embed');
        const status = wrapper.querySelector('.plot-status');
        let timer;
        function settle(ok) {
            clearTimeout(timer);
            wrapper.setAttribute('aria-busy', 'false');
            if (ok) {
                wrapper.classList.add('plot-ready');
                window.removeEventListener('message', receive);
                resizeVisiblePlots();
            } else {
                status.textContent = 'Plot is taking longer than expected. You can open it separately below.';
            }
            resolve();
        }
        function receive(event) {
            if (event.source !== frame.contentWindow) return;
            if (event.data?.type === 'fiber-plot-ready') settle(true);
            if (event.data?.type === 'fiber-plot-error') settle(false);
        }
        window.addEventListener('message', receive);
        timer = setTimeout(() => settle(false), 30000);
        frame.addEventListener('error', () => settle(false), {once: true});
        frame.src = frame.dataset.plotSrc;
    });
}
deckReady.then(() => {
    Reveal.on('slidechanged', resizeVisiblePlots);
    Reveal.on('fragmentshown', resizeVisiblePlots);
    // Yield so the title slide can paint before Plotly starts work.
    setTimeout(async () => {
        for (const frame of plotFrames) await loadPlot(frame);
    }, 500);
});
