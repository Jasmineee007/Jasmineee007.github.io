const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('after_generate', function() {
  const source = path.join(hexo.base_dir, 'source', '.github');
  const dest = path.join(hexo.public_dir, '.github');
  if (fs.existsSync(source)) {
    fs.cpSync(source, dest, { recursive: true });
  }
});
