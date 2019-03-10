const mix = require('laravel-mix');

mix.setResourceRoot(path.normalize('src'));
mix.setPublicPath(path.normalize('public'));

mix.js('src/js/app.js', 'public/dist')
    .js('src/js/public/app.js', 'public/dist/public.js')
    .sass('src/sass/app.scss', 'public/dist')
    .version()
    .sourceMaps();
