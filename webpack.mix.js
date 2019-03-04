const mix = require('laravel-mix');

mix.setResourceRoot(path.normalize('src'));
mix.setPublicPath(path.normalize('public'));

mix.js('src/js/app.js', 'public/dist')
   .sass('src/sass/app.scss', 'public/dist')
    .version()
    .sourceMaps();
