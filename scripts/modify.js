'use strict';
const { filter } = hexo.extend;
const cheerio = require('cheerio');

// 一图流：把文章页顶部 banner 图移动到内容区，作为一张圆角卡片
function insertTopImg($) {
  const header = $('#page-header');
  if (header.length === 0) return;
  const background = header.css('background-image');
  if (!background || background === 'none') return;
  $('#post').prepend(`<div class="top-img" style="background-image:${background};"></div>`);
}

filter.register('after_render:html', (str) => {
  const $ = cheerio.load(str, { decodeEntities: false });
  insertTopImg($);
  return $.html();
});
