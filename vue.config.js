module.exports = {
    devServer: {
        allowedHosts: 'all',
        https: (() => process.env.HTTPS_ENABLED === 'true' ? {
            key: process.env.HTTPS_KEY_PATH,
            cert: process.env.HTTPS_CRT_PATH,
        } : undefined) (),
        host: process.env.HTTP_HOST,
        port: process.env.HTTP_PORT,
    },
    chainWebpack: config => {
        config.module
            .rule('vue')
            .use('vue-loader')
            .loader('vue-loader')
            .tap(options => {
                options.transformAssetUrls = {
                    img: 'src',
                    image: 'xlink:href',
                    'b-avatar': 'src',
                    'b-img': 'src',
                    'b-img-lazy': ['src', 'blank-src'],
                    'b-card': 'img-src',
                    'b-card-img': 'src',
                    'b-card-img-lazy': ['src', 'blank-src'],
                    'b-carousel-slide': 'img-src',
                    'b-embed': 'src'
                }

                return options
            })
    }
}
