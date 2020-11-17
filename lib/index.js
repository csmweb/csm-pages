// 实现这个项目的构建任务
// gulp构建过程工作原理就是读取流，转换流和写入流
const {
  src,
  dest,
  parallel,
  series,
  watch
} = require('gulp')

// 多次打包会有冗余文件需要删除 del
const del = require('del')
// 热更新开发服务器 browser-sync
const browserSync = require('browser-sync')
// 自动加载插件 gulp-load-plugins
const gulpLoadPlugins = require('gulp-load-plugins')

const plugins = gulpLoadPlugins()
const bs = browserSync.create()

const config = require('./config')

const clean = () => {
  return del([config.build.dist, config.build.temp])
}

// 样式编译——项目里使用sass，需要转换scss为css  gulp-sass
const style = () => {
  return src(config.build.paths.styles, {
      base: config.build.src,
      cwd: config.build.src
    })
    .pipe(plugins.sass({
      outputStyle: 'expanded'
    }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({
      stream: true
    }))
}
// JS编译——项目里使用了ES6语法，需要使用babel转换为ES5 gulp-babel @babel/core @babel/preset-env
const script = () => {
  return src(config.build.paths.scripts, {
      base: config.build.src,
      cwd: config.build.src
    })
    .pipe(plugins.babel({
      presets: [require('@babel/preset-env')]
    }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({
      stream: true
    }))
}

// 模板编译——项目页面需要使用模板引擎处理 gulp-swig
const page = () => {
  return src(config.build.paths.pages, {
      base: config.build.src,
      cwd: config.build.src
    })
    .pipe(plugins.swig({
      data: config.data,
      defaults: {
        cache: false
      }
    })) // 防止模板缓存导致页面不能及时更新
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({
      stream: true
    }))
}

// 图片字体压缩复制
const image = () => {
  return src(config.build.paths.images, {
      base: config.build.src,
      cwd: config.build.src
    })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, {
      base: config.build.src,
      cwd: config.build.src
    })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 项目打包的时候public里的文件作为不需要额外处理的文件，全部复制到打包目录下
const extra = () => {
  return src('**', {
      base: config.build.public,
      cwd: config.build.public
    })
    .pipe(dest(config.build.dist))
}

const serve = () => {
  watch(config.build.paths.styles, {
    cwd: config.build.src
  }, style)
  watch(config.build.paths.scripts, {
    cwd: config.build.src
  }, script)
  watch(config.build.paths.pages, {
    cwd: config.build.src
  }, page)
  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ], {
    cwd: config.build.src
  }, bs.reload)

  watch('**', {
    cwd: config.build.public
  }, bs.reload)

  bs.init({
    notify: false,
    port: 3080,
    server: {
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// 处理文件引用，压缩/合并代码 gulp-useref
// 上线准备 压缩CSS、JS、html和图片 gulp-clean-css gulp-uglify gulp-imagemin
const useref = () => {
  return src(config.build.paths.pages, {
      base: config.build.temp,
      cwd: config.build.temp
    })
    .pipe(plugins.useref({
      searchPath: [config.build.temp, '.']
    }))
    // html js css
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
    .pipe(dest(config.build.dist))
}

const compile = parallel(style, script, page)

// 上线之前执行的任务
const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)

const deploy = series(compile, serve)

module.exports = {
  clean,
  build,
  deploy,
  lint
}