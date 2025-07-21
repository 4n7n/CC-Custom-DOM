const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const compression = require('compression');
const path = require('path');
const chalk = require('chalk');
const cors = require('cors');
const morgan = require('morgan');

// Cargar configuración de webpack
const webpackConfig = require('../build/webpack.config.js');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Configurar webpack para desarrollo
webpackConfig.mode = 'development';
webpackConfig.entry.main = [
  'webpack-hot-middleware/client?reload=true',
  './js/main.js'
];

// Agregar plugins de desarrollo
webpackConfig.plugins.push(
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoEmitOnErrorsPlugin()
);

// Crear compilador de webpack
const compiler = webpack(webpackConfig);

// Middleware de logging
app.use(morgan('dev'));

// CORS para desarrollo
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
  ],
  credentials: true
}));

// Compresión gzip
app.use(compression());

// Webpack dev middleware
app.use(webpackDevMiddleware(compiler, {
  publicPath: webpackConfig.output.publicPath,
  stats: {
    colors: true,
    hash: false,
    timings: true,
    chunks: false,
    chunkModules: false,
    modules: false
  }
}));

// Webpack hot middleware
app.use(webpackHotMiddleware(compiler, {
  log: console.log,
  path: '/__webpack_hmr',
  heartbeat: 10 * 1000
}));

// Servir archivos estáticos
app.use('/assets', express.static(path.join(__dirname, '../../assets'), {
  maxAge: '1h',
  etag: true
}));

// API Mock para desarrollo
app.use('/api', require('./mock-api'));

// Rutas de la aplicación
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'development',
    timestamp: new Date().toISOString()
  });
});

// SPA fallback - todas las rutas no encontradas sirven index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(chalk.red('Error:'), err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Iniciar servidor
const server = app.listen(PORT, HOST, () => {
  console.log(chalk.green.bold(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🎭 Community Stories Platform - Dev Server           ║
║                                                        ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║   Server running at: ${chalk.cyan(`http://${HOST}:${PORT}`)}            ║
║   API Mock at: ${chalk.cyan(`http://${HOST}:${PORT}/api`)}                 ║
║   Health check at: ${chalk.cyan(`http://${HOST}:${PORT}/health`)}          ║
║                                                        ║
║   ${chalk.yellow('Hot Module Replacement')} is enabled                  ║
║   ${chalk.yellow('CORS')} is enabled for development                    ║
║                                                        ║
║   Press ${chalk.red('CTRL-C')} to stop the server                     ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `));
});

// Manejo de señales de terminación
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log(chalk.yellow('\n⚡ Shutting down gracefully...'));
  
  server.close(() => {
    console.log(chalk.green('✅ Server closed'));
    process.exit(0);
  });
  
  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    console.error(chalk.red('❌ Could not close connections in time, forcefully shutting down'));
    process.exit(1);
  }, 10000);
}

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  console.error(chalk.red('Uncaught Exception:'), err);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  gracefulShutdown();
});

// Mock API para desarrollo
const mockApiRouter = express.Router();

// Mock de historias
mockApiRouter.get('/stories', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        title: 'Historia de la Comunidad del Valle',
        slug: 'comunidad-del-valle',
        thumbnail: '/assets/images/stories/valle-thumb.jpg',
        progress: 75,
        donations: 12500,
        goal: 20000,
        sponsors: ['sponsor-1', 'sponsor-2']
      },
      {
        id: '2',
        title: 'Tradiciones Ancestrales de los Andes',
        slug: 'tradiciones-andes',
        thumbnail: '/assets/images/stories/andes-thumb.jpg',
        progress: 45,
        donations: 9000,
        goal: 20000,
        sponsors: ['sponsor-3']
      }
    ]
  });
});

// Mock de sponsors
mockApiRouter.get('/sponsors', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'sponsor-1',
        name: 'Empresa Solidaria SA',
        logo: '/assets/images/sponsors/solidaria.png',
        tier: 'gold',
        totalDonated: 15000
      },
      {
        id: 'sponsor-2',
        name: 'Fundación Esperanza',
        logo: '/assets/images/sponsors/esperanza.png',
        tier: 'silver',
        totalDonated: 7500
      }
    ]
  });
});

// Mock de analytics
mockApiRouter.get('/analytics/:storyId', (req, res) => {
  res.json({
    success: true,
    data: {
      views: Math.floor(Math.random() * 10000) + 1000,
      uniqueVisitors: Math.floor(Math.random() * 5000) + 500,
      avgSessionDuration: Math.floor(Math.random() * 600) + 120,
      scrollCompletion: Math.floor(Math.random() * 30) + 70,
      shares: Math.floor(Math.random() * 500) + 50,
      donations: Math.floor(Math.random() * 100) + 10
    }
  });
});

// Mock de donaciones
mockApiRouter.post('/donations', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'donation-' + Date.now(),
      amount: req.body.amount || 50,
      status: 'completed',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = mockApiRouter;