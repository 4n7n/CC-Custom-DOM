/**
 * Webpack Production Configuration
 * Optimized build configuration for production deployment
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;
const PreloadWebpackPlugin = require('@vue/preload-webpack-plugin');
const WebpackPwaManifest = require('webpack-pwa-manifest');

// Performance budgets configuration
const performanceBudgets = {
    maxAssetSize: 500000, // 500KB
    maxEntrypointSize: 1000000, // 1MB
    hints: 'error'
};

// Optimization settings
const optimizationConfig = {
    minimize: true,
    minimizer: [
        new TerserPlugin({
            parallel: true,
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                    pure_funcs: ['console.log', 'console.info', 'console.debug'],
                    passes: 2,
                    unsafe: false,
                    unsafe_comps: false,
                    warnings: false
                },
                mangle: {
                    safari10: true,
                    keep_fnames: false,
                    reserved: ['$', 'jQuery', 'webpack']
                },
                format: {
                    comments: false,
                    ascii_only: true
                },
                sourceMap: false
            },
            extractComments: false
        }),
        new CssMinimizerPlugin({
            parallel: true,
            minimizerOptions: {
                preset: [
                    'default',
                    {
                        discardComments: { removeAll: true },
                        normalizeWhitespace: true,
                        colormin: true,
                        convertValues: true,
                        discardDuplicates: true,
                        discardEmpty: true,
                        discardOverridden: true,
                        discardUnused: true,
                        mergeIdents: true,
                        mergeLonghand: true,
                        mergeRules: true,
                        minifyFontValues: true,
                        minifyGradients: true,
                        minifyParams: true,
                        minifySelectors: true,
                        normalizeCharset: true,
                        normalizeDisplayValues: true,
                        normalizePositions: true,
                        normalizeRepeatStyle: true,
                        normalizeString: true,
                        normalizeTimingFunctions: true,
                        normalizeUnicode: true,
                        normalizeUrl: true,
                        orderedValues: true,
                        reduceIdents: true,
                        reduceInitial: true,
                        reduceTransforms: true,
                        svgo: true,
                        uniqueSelectors: true
                    }
                ]
            }
        }),
        new ImageMinimizerPlugin({
            minimizer: {
                implementation: ImageMinimizerPlugin.imageminMinify,
                options: {
                    plugins: [
                        ['imagemin-mozjpeg', { quality: 80, progressive: true }],
                        ['imagemin-pngquant', { quality: [0.6, 0.8] }],
                        ['imagemin-svgo', {
                            plugins: [
                                { name: 'preset-default', params: { overrides: { removeViewBox: false } } }
                            ]
                        }],
                        ['imagemin-webp', { quality: 85 }]
                    ]
                }
            },
            generator: [
                {
                    type: 'asset',
                    preset: 'webp-custom-name',
                    implementation: ImageMinimizerPlugin.imageminGenerate,
                    options: {
                        plugins: ['imagemin-webp']
                    }
                }
            ]
        })
    ],
    
    splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 500000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 5,
        enforceSizeThreshold: 50000,
        cacheGroups: {
            default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true
            },
            vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: -10,
                chunks: 'all',
                enforce: true,
                maxSize: 300000
            },
            common: {
                name: 'common',
                minChunks: 2,
                priority: -15,
                chunks: 'all',
                maxSize: 200000
            },
            react: {
                test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                name: 'react',
                chunks: 'all',
                priority: 10,
                enforce: true
            },
            utilities: {
                test: /[\\/]node_modules[\\/](lodash|moment|date-fns)[\\/]/,
                name: 'utilities',
                chunks: 'all',
                priority: 8,
                enforce: true
            },
            ui: {
                test: /[\\/]node_modules[\\/](@mui|antd|bootstrap)[\\/]/,
                name: 'ui-library',
                chunks: 'all',
                priority: 7,
                enforce: true
            },
            charts: {
                test: /[\\/]node_modules[\\/](chart\.js|d3|recharts)[\\/]/,
                name: 'charts',
                chunks: 'all',
                priority: 6,
                enforce: true
            }
        }
    },
    
    runtimeChunk: {
        name: 'runtime'
    },
    
    usedExports: true,
    sideEffects: false,
    
    moduleIds: 'deterministic',
    chunkIds: 'deterministic'
};

// Plugins configuration
const pluginsConfig = [
    new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['**/*'],
        dangerouslyAllowCleanPatternsOutsideProject: false,
        dry: false
    }),
    
    new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
        'process.env.BUILD_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
        'process.env.BUILD_DATE': JSON.stringify(new Date().toISOString()),
        '__DEV__': false,
        '__PROD__': true
    }),
    
    new HtmlWebpackPlugin({
        template: './src/index.html',
        filename: 'index.html',
        inject: 'body',
        minify: {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: true,
            removeEmptyAttributes: true,
            removeOptionalTags: true,
            sortAttributes: true,
            sortClassName: true
        },
        meta: {
            viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no',
            'theme-color': '#000000',
            description: 'High-performance web application'
        }
    }),
    
    new MiniCssExtractPlugin({
        filename: 'css/[name].[contenthash:8].css',
        chunkFilename: 'css/[name].[contenthash:8].chunk.css',
        ignoreOrder: false,
        experimentalUseImportModule: true
    }),
    
    new PreloadWebpackPlugin({
        rel: 'preload',
        include: 'initial',
        fileBlacklist: [/\.map$/, /hot-update\.js$/]
    }),
    
    new PreloadWebpackPlugin({
        rel: 'prefetch',
        include: 'asyncChunks'
    }),
    
    new CompressionPlugin({
        filename: '[path][base].gz',
        algorithm: 'gzip',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192,
        minRatio: 0.8,
        compressionOptions: {
            level: 9,
            chunkSize: 16 * 1024,
            windowBits: 15,
            memLevel: 8,
            strategy: 0
        }
    }),
    
    new CompressionPlugin({
        filename: '[path][base].br',
        algorithm: 'brotliCompress',
        test: /\.(js|css|html|svg)$/,
        threshold: 8192,
        minRatio: 0.8,
        compressionOptions: {
            params: {
                [require('zlib').constants.BROTLI_PARAM_QUALITY]: 11,
                [require('zlib').constants.BROTLI_PARAM_SIZE_HINT]: 65536
            }
        }
    }),
    
    new WorkboxPlugin.GenerateSW({
        clientsClaim: true,
        skipWaiting: true,
        swDest: 'sw.js',
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
                urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif)$/,
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
                urlPattern: /\.(?:js|css)$/,
                handler: 'StaleWhileRevalidate',
                options: {
                    cacheName: 'static-resources'
                }
            }
        ],
        exclude: [/\.map$/, /manifest$/, /\.htaccess$/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        mode: 'production'
    }),
    
    new WebpackPwaManifest({
        name: 'Performance Analytics App',
        short_name: 'PerfApp',
        description: 'High-performance analytics application',
        background_color: '#ffffff',
        theme_color: '#000000',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
            {
                src: path.resolve('src/assets/icon.png'),
                sizes: [96, 128, 192, 256, 384, 512],
                purpose: 'maskable any'
            }
        ],
        inject: true,
        fingerprints: true,
        ios: true,
        publicPath: '/',
        includeDirectory: true
    }),
    
    new CopyWebpackPlugin({
        patterns: [
            {
                from: 'public',
                to: '',
                globOptions: {
                    ignore: ['**/index.html']
                }
            },
            {
                from: 'src/assets/robots.txt',
                to: 'robots.txt'
            },
            {
                from: 'src/assets/sitemap.xml',
                to: 'sitemap.xml'
            }
        ]
    }),
    
    new LicenseWebpackPlugin({
        outputFilename: 'licenses.txt',
        perChunkOutput: false,
        addBanner: true,
        bannertText: (packageName) => `/*! ${packageName} */`,
        includePackagesWithoutLicense: false,
        unacceptableLicenseTest: (licenseType) => licenseType === 'GPL',
        handleUnacceptableLicense: (packageName, licenseType) => {
            throw new Error(`Package ${packageName} has unacceptable license ${licenseType}`);
        },
        handleMissingLicenseText: (packageName, licenseType) => {
            return `License information for ${packageName} (${licenseType}) is not available.`;
        }
    }),
    
    // Bundle analyzer - only in CI or when explicitly requested
    ...(process.env.ANALYZE === 'true' ? [
        new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle-report.html',
            generateStatsFile: true,
            statsFilename: 'bundle-stats.json',
            logLevel: 'info'
        })
    ] : []),
    
    new webpack.ids.HashedModuleIdsPlugin({
        context: path.resolve(__dirname),
        hashFunction: 'sha256',
        hashDigest: 'hex',
        hashDigestLength: 20
    }),
    
    new webpack.optimize.ModuleConcatenationPlugin(),
    
    new webpack.ProgressPlugin({
        activeModules: false,
        entries: true,
        modules: true,
        modulesCount: 5000,
        profile: false,
        dependencies: true,
        dependenciesCount: 10000,
        percentBy: null
    })
];

// Main webpack configuration
module.exports = {
    mode: 'production',
    
    entry: {
        main: './src/index.js',
        analytics: './src/modules/analytics/index.js',
        performance: './src/modules/performance/index.js'
    },
    
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'js/[name].[contenthash:8].js',
        chunkFilename: 'js/[name].[contenthash:8].chunk.js',
        assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
        publicPath: '/',
        clean: true,
        hashFunction: 'xxhash64',
        pathinfo: false,
        compareBeforeEmit: true,
        globalObject: 'this',
        environment: {
            arrowFunction: true,
            bigIntLiteral: false,
            const: true,
            destructuring: true,
            dynamicImport: true,
            forOf: true,
            module: true,
            optionalChaining: true,
            templateLiteral: true
        }
    },
    
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.wasm'],
        modules: ['node_modules', path.resolve(__dirname, 'src')],
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@components': path.resolve(__dirname, 'src/components'),
            '@modules': path.resolve(__dirname, 'src/modules'),
            '@assets': path.resolve(__dirname, 'src/assets'),
            '@utils': path.resolve(__dirname, 'src/utils'),
            '@config': path.resolve(__dirname, 'src/config'),
            '@workers': path.resolve(__dirname, 'src/workers')
        },
        fallback: {
            path: require.resolve('path-browserify'),
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
            buffer: require.resolve('buffer'),
            process: require.resolve('process/browser')
        },
        symlinks: false,
        cacheWithContext: false,
        preferRelative: true
    },
    
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    useBuiltIns: 'entry',
                                    corejs: 3,
                                    modules: false,
                                    targets: {
                                        browsers: ['> 1%', 'last 2 versions', 'not dead']
                                    }
                                }],
                                ['@babel/preset-react', {
                                    runtime: 'automatic'
                                }],
                                '@babel/preset-typescript'
                            ],
                            plugins: [
                                '@babel/plugin-proposal-class-properties',
                                '@babel/plugin-proposal-object-rest-spread',
                                '@babel/plugin-proposal-optional-chaining',
                                '@babel/plugin-proposal-nullish-coalescing-operator',
                                '@babel/plugin-syntax-dynamic-import',
                                ['@babel/plugin-transform-runtime', {
                                    corejs: false,
                                    helpers: true,
                                    regenerator: true,
                                    useESModules: false
                                }]
                            ],
                            cacheDirectory: true,
                            cacheCompression: false,
                            compact: true
                        }
                    }
                ]
            },
            
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            sourceMap: false,
                            modules: {
                                auto: true,
                                localIdentName: '[hash:base64:8]'
                            }
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    require('autoprefixer'),
                                    require('cssnano')({
                                        preset: ['default', {
                                            discardComments: { removeAll: true }
                                        }]
                                    })
                                ]
                            },
                            sourceMap: false
                        }
                    }
                ]
            },
            
            {
                test: /\.s[ac]ss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 2,
                            sourceMap: false,
                            modules: {
                                auto: true,
                                localIdentName: '[hash:base64:8]'
                            }
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    require('autoprefixer'),
                                    require('cssnano')({
                                        preset: ['default', {
                                            discardComments: { removeAll: true }
                                        }]
                                    })
                                ]
                            },
                            sourceMap: false
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            implementation: require('sass'),
                            sourceMap: false,
                            sassOptions: {
                                outputStyle: 'compressed',
                                precision: 6
                            }
                        }
                    }
                ]
            },
            
            {
                test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
                type: 'asset',
                parser: {
                    dataUrlCondition: {
                        maxSize: 8 * 1024 // 8KB
                    }
                },
                generator: {
                    filename: 'images/[name].[contenthash:8][ext]'
                }
            },
            
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name].[contenthash:8][ext]'
                }
            },
            
            {
                test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'media/[name].[contenthash:8][ext]'
                }
            },
            
            {
                test: /\.worker\.(js|ts)$/,
                use: {
                    loader: 'worker-loader',
                    options: {
                        filename: 'workers/[name].[contenthash:8].js',
                        chunkFilename: 'workers/[id].[contenthash:8].js'
                    }
                }
            },
            
            {
                test: /\.wasm$/,
                type: 'asset/resource',
                generator: {
                    filename: 'wasm/[name].[contenthash:8][ext]'
                }
            }
        ]
    },
    
    optimization: optimizationConfig,
    plugins: pluginsConfig,
    
    performance: {
        hints: performanceBudgets.hints,
        maxAssetSize: performanceBudgets.maxAssetSize,
        maxEntrypointSize: performanceBudgets.maxEntrypointSize,
        assetFilter: (assetFilename) => {
            return !/\.map$/.test(assetFilename) && 
                   !/\.gz$/.test(assetFilename) && 
                   !/\.br$/.test(assetFilename);
        }
    },
    
    stats: {
        preset: 'normal',
        assets: true,
        assetsSpace: 25,
        builtAt: true,
        cached: false,
        cachedAssets: false,
        children: false,
        chunks: false,
        chunkModules: false,
        chunkOrigins: false,
        colors: true,
        depth: false,
        entrypoints: true,
        env: false,
        errors: true,
        errorDetails: true,
        hash: false,
        modules: false,
        moduleTrace: true,
        outputPath: true,
        performance: true,
        providedExports: false,
        publicPath: false,
        reasons: false,
        source: false,
        timings: true,
        usedExports: false,
        version: false,
        warnings: true
    },
    
    cache: {
        type: 'filesystem',
        buildDependencies: {
            config: [__filename]
        },
        compression: 'gzip'
    },
    
    target: ['web', 'es2017'],
    
    bail: true,
    
    experiments: {
        topLevelAwait: true,
        outputModule: false
    },
    
    externals: {
        // Externalize large libraries that can be loaded from CDN
        'react': 'React',
        'react-dom': 'ReactDOM',
        'lodash': '_',
        'moment': 'moment'
    },
    
    node: {
        global: false,
        __filename: false,
        __dirname: false
    }
};

// Environment-specific optimizations
if (process.env.NODE_ENV === 'production') {
    // Additional production optimizations
    module.exports.plugins.push(
        new webpack.BannerPlugin({
            banner: `
/*!
 * ${require('./package.json').name} v${require('./package.json').version}
 * Built on ${new Date().toISOString()}
 * (c) ${new Date().getFullYear()} - Performance Analytics
 */
            `.trim(),
            entryOnly: true
        })
    );
    
    // Source map configuration for production
    module.exports.devtool = false;
    
    // Additional performance monitoring
    module.exports.plugins.push(
        new webpack.ProgressPlugin((percentage, message, ...args) => {
            if (process.env.CI) {
                console.log(`${Math.round(percentage * 100)}% ${message} ${args.join(' ')}`);
            }
        })
    );
}

// CI/CD specific configurations
if (process.env.CI === 'true') {
    // Disable progress plugin in CI
    module.exports.plugins = module.exports.plugins.filter(
        plugin => !(plugin instanceof webpack.ProgressPlugin)
    );
    
    // Add build info
    module.exports.plugins.push(
        new webpack.DefinePlugin({
            'process.env.CI_BUILD_ID': JSON.stringify(process.env.GITHUB_RUN_ID || process.env.CI_BUILD_ID || 'local'),
            'process.env.CI_COMMIT_SHA': JSON.stringify(process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown')
        })
    );
}