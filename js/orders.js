function localIsoDate(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatOrderDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(date)
    .replace(/\sр\.$/, '');
}

function renderOrderDocument() {
  const type = document.getElementById('order-type').value;
  const number = document.getElementById('order-number').value.trim();
  const year = document.getElementById('order-year').value.trim();
  const date = document.getElementById('order-date').value;
  const classification = document.getElementById('order-classification').value.trim();
  const subject = document.getElementById('order-subject').value.trim();
  const preamble = document.getElementById('order-preamble').value.trim();
  const clauses = document.getElementById('order-clauses-input').value
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean);

  document.getElementById('preview-order-number').textContent = `${type} №${number || '—'}/${year || '—'}`;
  document.getElementById('preview-order-classification').textContent = classification || '—';
  document.getElementById('preview-order-date').textContent = formatOrderDate(date);
  document.getElementById('preview-order-type').textContent = type;
  document.getElementById('preview-order-subject').textContent = subject || 'НАЗВА ДОКУМЕНТА';
  document.getElementById('preview-order-preamble').textContent = preamble;

  const list = document.getElementById('preview-order-clauses');
  list.replaceChildren();
  clauses.forEach(text => {
    const item = document.createElement('li');
    item.textContent = text;
    list.appendChild(item);
  });
}

function loadOrderTemplateImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Не вдалося відкрити зображення шаблону: ${path}`));
    const key = path.split('/').pop().replace('order-', '').replace('.png', '');
    const embedded = window.ORDER_TEMPLATE_IMAGES && window.ORDER_TEMPLATE_IMAGES[key];
    if (!embedded) {
      reject(new Error(`Не знайдено вбудоване зображення шаблону: ${path}`));
      return;
    }
    image.src = embedded;
  });
}

async function downloadOrderImage() {
  renderOrderDocument();
  const button = document.getElementById('download-order-image-button');
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = 'Зберігаємо…';

  try {
    const [signature, seal, emblem] = await Promise.all([
      loadOrderTemplateImage('media/order-signature.png'),
      loadOrderTemplateImage('media/order-seal.png'),
      loadOrderTemplateImage('media/order-emblem.png')
    ]);

    const width = 794;
    const scale = 2;
    const left = 62;
    const right = width - 62;
    const contentWidth = right - left;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Не вдалося створити зображення.');
    const clauses = [...document.querySelectorAll('#preview-order-clauses li')].map(item => item.textContent.trim());
    const wrap = (text, maxWidth) => {
      const words = String(text || '').split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      return lines;
    };

    ctx.font = 'bold 13.5px "Times New Roman", Georgia, serif';
    const clauseLines = clauses.map(text => wrap(text, contentWidth - 36));
    const clausesHeight = clauseLines.reduce((sum, lines) => sum + Math.max(1, lines.length) * 19 + 4, 0);
    const signatureY = Math.max(690, 526 + clausesHeight + 48);
    const height = Math.max(1123, signatureY + 150);
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#171717';
    ctx.textBaseline = 'alphabetic';

    ctx.drawImage(emblem, (width - 68) / 2, 38, 68, 68);
    ctx.textAlign = 'center';
    ctx.font = '14px "Times New Roman", Georgia, serif';
    ctx.fillText('ШТАТ NG', width / 2, 126);
    ctx.fillText('НАЦІОНАЛЬНА ПОЛІЦІЯ ШТАТУ NG', width / 2, 151);
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1;
    [178, 182, 186].forEach(y => { ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke(); });

    ctx.textAlign = 'left';
    ctx.font = '13px "Times New Roman", Georgia, serif';
    ctx.fillText(document.getElementById('preview-order-number').textContent, left, 222);
    ctx.fillText(`Класифікація: ${document.getElementById('order-classification').value.trim() || '—'}`, left, 240);
    ctx.textAlign = 'right';
    ctx.fillText(document.getElementById('preview-order-date').textContent, right, 222);

    let y = 300;
    ctx.textAlign = 'center';
    ctx.font = 'bold 23px "Times New Roman", Georgia, serif';
    ctx.fillText(document.getElementById('preview-order-type').textContent, width / 2, y);
    y += 38;
    ctx.font = 'bold 13px "Times New Roman", Georgia, serif';
    const centerText = (text, font, maxWidth, lineHeight) => {
      ctx.font = font;
      const lines = wrap(text, maxWidth);
      lines.forEach(line => { y += lineHeight; ctx.fillText(line, width / 2, y); });
      return lines.length;
    };
    centerText(document.getElementById('preview-order-subject').textContent, 'bold 13px "Times New Roman", Georgia, serif', contentWidth, 18);
    y += 8;
    centerText(document.getElementById('preview-order-preamble').textContent, 'bold 13px "Times New Roman", Georgia, serif', contentWidth, 18);
    y += 10;
    ctx.font = 'bold 14px "Times New Roman", Georgia, serif';
    ctx.fillText('НАКАЗУЮ:', width / 2, y);
    y += 24;

    ctx.textAlign = 'left';
    ctx.font = 'bold 13.5px "Times New Roman", Georgia, serif';
    clauseLines.forEach((lines, index) => {
      ctx.fillText(`${index + 1}.`, left + 4, y);
      lines.forEach(line => { y += 19; ctx.fillText(line, left + 28, y); });
      y += 4;
    });

    ctx.font = 'bold 13px "Times New Roman", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('Генерал Національної поліції', left, signatureY + 42);
    ctx.drawImage(signature, left + 145, signatureY - 4, 260, 92);
    ctx.drawImage(seal, right - 130, signatureY - 13, 118, 118);

    const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('Не вдалося зберегти фото документа.');
    const link = document.createElement('a');
    const number = document.getElementById('order-number').value.trim() || 'document';
    const year = document.getElementById('order-year').value.trim() || new Date().getFullYear();
    const typeSlug = document.getElementById('order-type').value === 'ПОСТАНОВА' ? 'postanova' : 'nakaz';
    const url = URL.createObjectURL(png);
    link.href = url;
    link.download = `${typeSlug}-${number}-${year}.png`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Помилка збереження документа як PNG:', error);
    const reason = error && error.message ? `\n\nПричина: ${error.message}` : '';
    alert(`Не вдалося зберегти документ як PNG.${reason}`);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

const ordersAccessForm = document.getElementById('orders-access-form');
if (ordersAccessForm) {
  ordersAccessForm.addEventListener('submit', async event => {
    event.preventDefault();
    const error = document.getElementById('orders-access-error');
    const password = document.getElementById('orders-access-password').value;
    error.classList.add('hidden');
    try {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
      const hash = [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (document.getElementById('orders-access-user').value === 'vito-westford' && hash === '3bf64b6372cb27ceb1f17bd7604a415b3e03617e51f6a1f7512fa673d7408fba') {
        state.ordersAuthorized = true;
        document.getElementById('orders-access-gate').classList.add('hidden');
        document.getElementById('orders-protected-content').classList.remove('hidden');
        document.getElementById('orders-access-password').value = '';
        renderOrderDocument();
      } else {
        error.classList.remove('hidden');
      }
    } catch (accessError) {
      error.textContent = 'Вхід доступний через захищене HTTPS-з’єднання.';
      error.classList.remove('hidden');
    }
  });
}

document.querySelectorAll('#view-orders input, #view-orders select, #view-orders textarea').forEach(field => {
  field.addEventListener('input', renderOrderDocument);
  field.addEventListener('change', renderOrderDocument);
});

const orderYearField = document.getElementById('order-year');
const orderDateField = document.getElementById('order-date');
if (orderYearField && orderDateField) {
  const today = new Date();
  orderYearField.value = String(today.getFullYear());
  orderDateField.value = localIsoDate(today);
  renderOrderDocument();
}
