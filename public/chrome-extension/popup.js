const draftInput = document.getElementById('draft');
const outputDiv = document.getElementById('output');

document.getElementById('enhance-btn')?.addEventListener('click', () => {
  const text = draftInput.value.trim();
  if (!text) return;
  outputDiv.textContent = 'Generating 3 versions...';
  chrome.runtime.sendMessage(
    {
      type: 'WRITEBETTER_API_REQUEST',
      endpoint: '/api/writing/enhance',
      payload: { text, platform: 'linkedin', mode: 'improve_writing' },
    },
    (res) => {
      if (!res?.ok) {
        outputDiv.textContent = res?.error || 'Error connecting to backend.';
        return;
      }
      outputDiv.innerHTML = res.data.variations
        .map(
          (v) =>
            `<div style="padding:8px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
              <div style="font-weight:600;font-size:11px;color:#475569;margin-bottom:4px;">${v.label}</div>
              <div>${v.text}</div>
            </div>`
        )
        .join('');
    }
  );
});

document.getElementById('factcheck-btn')?.addEventListener('click', () => {
  const text = draftInput.value.trim();
  if (!text) return;
  outputDiv.textContent = 'Checking factual claims & sources...';
  chrome.runtime.sendMessage(
    {
      type: 'WRITEBETTER_API_REQUEST',
      endpoint: '/api/factcheck/analyze',
      payload: { text },
    },
    (res) => {
      if (!res?.ok) {
        outputDiv.textContent = res?.error || 'Error connecting to backend.';
        return;
      }
      outputDiv.innerHTML = `
        <div style="padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
          <div style="font-weight:600;margin-bottom:6px;">${res.data.summaryVerdict}</div>
          <div style="font-size:12px;color:#334155;"><strong>Improved Credible Draft:</strong> ${res.data.improvedCredibleVersion}</div>
        </div>
      `;
    }
  );
});
