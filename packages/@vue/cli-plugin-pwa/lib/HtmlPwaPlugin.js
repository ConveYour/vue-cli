const HtmlWebpackPlugin = require('html-webpack-plugin')

const ID = 'vue-cli:pwa-html-plugin'

const defaults = {
  name: 'PWA app',
  themeColor: '#4DBA87', // The Vue color
  msTileColor: '#000000',
  appleMobileWebAppCapable: 'no',
  appleMobileWebAppStatusBarStyle: 'default',
  assetsVersion: '',
  manifestPath: 'manifest.json',
  manifestOptions: {},
  manifestCrossorigin: undefined,
  manifestPublicPath: undefined
}

const defaultManifest = {
  icons: [
    {
      'src': './img/icons/android-chrome-192x192.png',
      'sizes': '192x192',
      'type': 'image/png'
    },
    {
      'src': './img/icons/android-chrome-512x512.png',
      'sizes': '512x512',
      'type': 'image/png'
    },
    {
      'src': './img/icons/android-chrome-maskable-192x192.png',
      'sizes': '192x192',
      'type': 'image/png',
      'purpose': 'maskable'
    },
    {
      'src': './img/icons/android-chrome-maskable-512x512.png',
      'sizes': '512x512',
      'type': 'image/png',
      'purpose': 'maskable'
    }
  ],
  start_url: '.',
  display: 'standalone',
  background_color: '#000000'
}

const defaultIconPaths = {
  faviconSVG: 'img/icons/favicon.svg',
  favicon32: 'img/icons/favicon-32x32.png',
  favicon16: 'img/icons/favicon-16x16.png',
  appleTouchIcon: 'img/icons/apple-touch-icon-152x152.png',
  maskIcon: 'img/icons/safari-pinned-tab.svg',
  msTileImage: 'img/icons/msapplication-icon-144x144.png'
}

module.exports = class HtmlPwaPlugin {
  constructor (options = {}) {
    const iconPaths = Object.assign({}, defaultIconPaths, options.iconPaths)
    delete options.iconPaths
    this.options = Object.assign({ iconPaths: iconPaths }, defaults, options)
  }

  apply (compiler) {
    compiler.hooks.compilation.tap(ID, compilation => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(ID, (data, cb) => {
        // wrap favicon in the base template with IE only comment
        data.html = data.html.replace(/<link rel="icon"[^>]+>/, '<!--[if IE]>$&<![endif]-->')
        cb(null, data)
      })

      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tapAsync(ID, (data, cb) => {
        const {
          name,
          themeColor,
          msTileColor,
          appleMobileWebAppCapable,
          appleMobileWebAppStatusBarStyle,
          assetsVersion,
          manifestPath,
          iconPaths,
          manifestCrossorigin,
          manifestPublicPath
        } = this.options
        const { publicPath } = compiler.options.output

        const assetsVersionStr = assetsVersion ? `?v=${assetsVersion}` : ''

        // Favicons
        if (iconPaths.faviconSVG != null) {
          data.headTags.push(makeTag('link', {
            rel: 'icon',
            type: 'image/svg+xml',
            href: getTagHref(publicPath, iconPaths.faviconSVG, assetsVersionStr)
          }))
        }
        if (iconPaths.favicon32 != null) {
          data.headTags.push(makeTag('link', {
            rel: 'icon',
            type: 'image/png',
            sizes: '32x32',
            href: getTagHref(publicPath, iconPaths.favicon32, assetsVersionStr)
          }))
        }

        if (iconPaths.favicon16 != null) {
          data.headTags.push(makeTag('link', {
            rel: 'icon',
            type: 'image/png',
            sizes: '16x16',
            href: getTagHref(publicPath, iconPaths.favicon16, assetsVersionStr)
          }))
        }

        // Add to home screen for Android and modern mobile browsers
        data.headTags.push(
          makeTag('link', manifestCrossorigin
            ? {
              rel: 'manifest',
              href: getTagHref(manifestPublicPath || publicPath, manifestPath, assetsVersionStr),
              crossorigin: manifestCrossorigin
            }
            : {
              rel: 'manifest',
              href: getTagHref(manifestPublicPath || publicPath, manifestPath, assetsVersionStr)
            }
          )
        )

        if (themeColor != null) {
          data.headTags.push(
            makeTag('meta', {
              name: 'theme-color',
              content: themeColor
            })
          )
        }

        // Add to home screen for Safari on iOS
        data.headTags.push(
          makeTag('meta', {
            name: 'apple-mobile-web-app-capable',
            content: appleMobileWebAppCapable
          }),
          makeTag('meta', {
            name: 'apple-mobile-web-app-status-bar-style',
            content: appleMobileWebAppStatusBarStyle
          }),
          makeTag('meta', {
            name: 'apple-mobile-web-app-title',
            content: name
          })
        )
        if (iconPaths.appleTouchIcon != null) {
          data.headTags.push(makeTag('link', {
            rel: 'apple-touch-icon',
            href: getTagHref(publicPath, iconPaths.appleTouchIcon, assetsVersionStr)
          }))
        }
        if (iconPaths.maskIcon != null) {
          data.headTags.push(makeTag('link', {
            rel: 'mask-icon',
            href: getTagHref(publicPath, iconPaths.maskIcon, assetsVersionStr),
            color: themeColor
          }))
        }

        // Add to home screen for Windows
        if (iconPaths.msTileImage != null) {
          data.headTags.push(makeTag('meta', {
            name: 'msapplication-TileImage',
            content: getTagHref(publicPath, iconPaths.msTileImage, assetsVersionStr)
          }))
        }
        if (msTileColor != null) {
          data.headTags.push(
            makeTag('meta', {
              name: 'msapplication-TileColor',
              content: msTileColor
            })
          )
        }

        cb(null, data)
      })
    })

    if (!isHrefAbsoluteUrl(this.options.manifestPath)) {
      const {
        name,
        themeColor,
        manifestPath,
        manifestOptions
      } = this.options
      const publicOptions = {
        name,
        short_name: name,
        theme_color: themeColor
      }
      const outputManifest = JSON.stringify(
        Object.assign(publicOptions, defaultManifest, manifestOptions)
      )
      const manifestAsset = {
        source: () => outputManifest,
        size: () => outputManifest.length
      }

      compiler.hooks.compilation.tap(ID, compilation => {
        compilation.hooks.processAssets.tap(
          { name: ID, stage: 'PROCESS_ASSETS_STAGE_ADDITIONS' },
          assets => { assets[manifestPath] = manifestAsset }
        )
      })
    }
  }
}

function makeTag (tagName, attributes, voidTag = true) {
  return {
    tagName,
    voidTag,
    attributes
  }
}

function getTagHref (publicPath, href, assetsVersionStr) {
  let tagHref = `${href}${assetsVersionStr}`
  if (!isHrefAbsoluteUrl(href)) {
    tagHref = `${publicPath}${tagHref}`
  }
  return tagHref
}

function isHrefAbsoluteUrl (href) {
  return /(http(s?)):\/\//gi.test(href)
}
