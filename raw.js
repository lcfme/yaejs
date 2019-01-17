function toHtml(env) {
  var buf = [];
  with (env) {
    buf.push(
      `<div>生成html函数</div>`,
      '<div> 变量',
      escapeHtml(var1),
      '</div>'
    );

    if (var2) {
      buf.push('<div>var2 == true</div>');
    } else {
      buf.push('<div>var2 == false</div>');
    }
    console.log(this, window);
  }
  return buf.join('\n');
}

function escapeHtml(r) {
  return String(r)
    .replace(/&(?!\w+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
