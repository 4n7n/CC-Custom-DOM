const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  mode: isDevelopment ? 'development' : 'production',
  
  entry: {
    main: './js/main.js',
    community: './js/modules/community.js',
    sponsor: './js/modules/sponsor.js',
    analytics: './js/modules/analytics.js'
  },
  
  output: {
    path: path.resolve(__dirname, '../../dist'),
    filename: isDevelopment ? 'js/[name].js' : 'js/[name].[contenthash:8].js',
    chunkFilename: isDevelopment ? 'js/[name].chunk.js' : 'js/[name].[contenthash:8].chunk.js',
    clean: true,
    publicPath: '/'
  },
  
  devtool: isDevelopment ? 'eval-source-map' : 'source-map',
  
  module: {
    rules: [
      // JavaScript
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: '> 0.5%, last 2 versions, not dead',
                modules: false,
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-optional-chaining',
              '@babel/plugin-proposal-nullish-coalescing-operator'
            ]
          }
        }
      },
      
      // CSS
      {
        test: /\.css$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: isDevelopment
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  'postcss-preset-env',
                  'autoprefixer',
                  'postcss-custom-properties'
                ]
              }
            }
          }
        ]
      },
      
      // Images
      {
        test: /\.(png|jpg|jpeg|gif|webp|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8kb
          }
        },
        generator: {
          filename: 'assets/images/[name].[contenthash:8][ext]'
        }
      },
      
      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[name].[contenthash:8][ext]'
        }
      },
      
      // Audio
      {
        test: /\.(mp3|ogg|wav)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/audio/[name].[contenthash:8][ext]'
        }
      },
      
      // Video
      {
        test: /\.(mp4|webm)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/video/[name].[contenthash:8][ext]'
        }
      },
      
      // GLSL Shaders
      {
        test: /\.(glsl|vs|fs|vert|frag)$/,
        exclude: /node_modules/,
        use: 'raw-loader'
      }
    ]
  },
  
  plugins: [
    // HTML generation
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
      chunks: ['main'],
      minify: !isDevelopment && {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      }
    }),
    
    // CSS extraction
    ...(!isDevelopment ? [new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css'
    })] : []),
    
    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'assets/icons', to: 'assets/icons' },
        { from: 'assets/images/og-default.jpg', to: 'assets/images/og-default.jpg' },
        { from: 'robots.txt', to: 'robots.txt', noErrorOnMissing: true },
        { from: 'sitemap.xml', to: 'sitemap.xml', noErrorOnMissing: true }
      ]
    }),
    
    // PWA Service Worker
    ...(!isDevelopment ? [new WorkboxPlugin.GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'google-fonts-stylesheets'
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
            }
          }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
            }
          }
        },
        {
          urlPattern: /\.(?:mp3|ogg|wav)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'audio',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
            }
          }
        }
      ]
    })] : []),
    
    // Bundle analyzer (solo en desarrollo con flag)
    ...(process.env.ANALYZE ? [new BundleAnalyzerPlugin()] : [])
  ],
  
  optimization: {
    minimize: !isDevelopment,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: !isDevelopment
          },
          mangle: {
            safari10: true
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true
          }
        }
      }),
      new CssMinimizerPlugin(),
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminMinify,
          options: {
            plugins: [
              ['imagemin-gifsicle', { interlaced: true }],
              ['imagemin-mozjpeg', { progressive: true, quality: 85 }],
              ['imagemin-pngquant', { quality: [0.6, 0.8] }],
              ['imagemin-svgo', {
                plugins: [
                  { name: 'preset-default', params: { overrides: { removeViewBox: false } } }
                ]
              }]
            ]
          }
        }
      })
    ],
    
    runtimeChunk: 'single',
    
    moduleIds: 'deterministic',
    
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all'
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
          chunks: 'all'
        },
        three: {
          test: /[\\/]node_modules[\\/](three)[\\/]/,
          name: 'three',
          chunks: 'all',
          priority: 20
        },
        gsap: {
          test: /[\\/]node_modules[\\/](gsap)[\\/]/,
          name: 'gsap',
          chunks: 'all',
          priority: 20
        }
      }
    }
  },
  
  resolve: {
    extensions: ['.js', '.json', '.css'],
    alias: {
      '@': path.resolve(__dirname, '../../'),
      '@js': path.resolve(__dirname, '../../js'),
      '@css': path.resolve(__dirname, '../../css'),
      '@assets': path.resolve(__dirname, '../../assets'),
      '@components': path.resolve(__dirname, '../../js/components'),
      '@utils': path.resolve(__dirname, '../../js/utils'),
      '@config': path.resolve(__dirname, '../../config')
    }
  },
  
  performance: {
    hints: !isDevelopment && 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  
  stats: {
    colors: true,
    hash: false,
    version: false,
    timings: true,
    assets: true,
    chunks: false,
    modules: false,
    reasons: false,
    children: false,
    source: false,
    errors: true,
    errorDetails: true,
    warnings: true,
    publicPath: false
  }
};