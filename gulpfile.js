const { src, dest, watch, lastRun, parallel, series } = require("gulp");
const sass = require("gulp-dart-sass");
const glob = require("gulp-sass-glob-use-forward");

//sass
const postcss = require("gulp-postcss");

//js
const babel = require("gulp-babel");
const uglify = require("gulp-uglify");

//html
const plumber = require("gulp-plumber");
const notify = require("gulp-notify");
const ejs = require("gulp-ejs");
const rename = require("gulp-rename");

//ファイル、ディレクトリ削除
const del = require("del");

const browserSync = require("browser-sync");
const replace = require("gulp-replace");
const autoprefixer = require("autoprefixer");

const srcPath = {
  html: {
    src: ["./src/ejs/**/*.ejs", "!" + "./src/ejs/**/_*.ejs"],
    dist: "./dist/",
  },
  styles: {
    src: "./src/scss/**/*.scss",
    dist: "./dist/css",
    map: "./dist/css/map",
  },
  scripts: {
    src: "./src/js/**/*.js",
    dist: "./dist/js/",
    map: "./dist/js/map/",
  },
  images: {
    src: "./src/img/**/*.{jpg,jpeg,png,gif,svg}",
    dist: "./dist/img/",
  },
};

//htmlの処理自動化
const htmlFunc = () => {
  return src(srcPath.html.src)
    .pipe(
      plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
    )
    .pipe(ejs({}, {}, { ext: ".html" })) //ejsを纏める
    .pipe(rename({ extname: ".html" })) //拡張子をhtmlに
    .pipe(replace(/[\s\S]*?(<!DOCTYPE)/, "$1"))
    .pipe(dest(srcPath.html.dist))
    .pipe(browserSync.reload({ stream: true }));
};

//imageの処理自動化
const imageFunc = () => {
  return src(srcPath.images.src)
    .pipe(
      plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
    )
    .pipe(dest(srcPath.images.dist));
};

//Sassの処理自動化（開発用）
const stylesFunc = () => {
  return src(srcPath.styles.src, { sourcemaps: true })
    .pipe(
      plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
    )
    .pipe(glob())
    .pipe(
      sass
        .sync({
          includePaths: ["node_modules", "src/scss"], //パスを指定
          outputStyle: "expanded",
        })
        .on("error", sass.logError)
    )
    .pipe(
      postcss([
        autoprefixer({
          // IEは11以上、Androidは4、ios safariは8以上
          // その他は最新2バージョンで必要なベンダープレフィックスを付与する
          //指定の内容はpackage.jsonに記入している
          cascade: false,
          grid: true,
        }),
      ])
    )
    .pipe(dest(srcPath.styles.dist, { sourcemaps: "./map" }))
    .pipe(browserSync.reload({ stream: true }));
};

//Sassの処理自動化（圧縮用）
const stylesCompress = () => {
  return (
    src(srcPath.styles.src)
      .pipe(
        plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
      )
      .pipe(glob())
      .pipe(
        sass
          .sync({
            includePaths: ["node_modules", "src/scss"],
            outputStyle: "compressed",
          })
          .on("error", sass.logError)
      )
      .pipe(
        postcss([
          autoprefixer({
            cascade: false,
            grid: true,
          }),
        ])
      )
      //圧縮ファイル名をリネームする際に使用
      // .pipe(
      //   rename({
      //     suffix: ".min",
      //   })
      // )
      .pipe(dest(srcPath.styles.dist))
  );
};

//JavaScriptの処理自動化（開発用）
const scriptFunc = () => {
  return src(srcPath.scripts.src, { sourcemaps: true })
    .pipe(
      plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
    )
    .pipe(
      babel({
        presets: ["@babel/env"],
      })
    )
    .pipe(dest(srcPath.scripts.dist, { sourcemaps: "./map" }))
    .pipe(browserSync.reload({ stream: true }));
};

//JavaScriptの処理自動化（圧縮用）
const scriptCompress = () => {
  return (
    src(srcPath.scripts.src)
      .pipe(
        plumber({ errorHandler: notify.onError("Error: <%= error.message %>") })
      )
      .pipe(
        babel({
          presets: ["@babel/env"],
        })
      )
      .pipe(uglify({ output: { comments: /^!/ } }))
      // .pipe(
      //   rename({
      //     suffix: ".min",
      //   })
      // )
      .pipe(dest(srcPath.scripts.dist))
  );
};

//マップファイル除去
const cleanMap = () => {
  return del([srcPath.styles.map, srcPath.scripts.map]);
};

// ブラウザの読み込み処理
const browserSyncFunc = () => {
  browserSync({
    server: {
      baseDir: "./dist",
      index: "index.html",
    },
    reloadOnRestart: true,
  });
};

// ファイルに変更があったら反映
const watchFiles = () => {
  watch(srcPath.html.src, htmlFunc);
  watch(srcPath.styles.src, stylesFunc);
  watch(srcPath.scripts.src, scriptFunc);
};

exports.default = parallel(watchFiles, browserSyncFunc); //初期設定（フォルダ、ファイルの監視、ブラウザへの反映）
exports.dev = parallel(htmlFunc, stylesFunc, scriptFunc, imageFunc); //出力するだけの設定(開発環境)
exports.build = parallel(
  htmlFunc,
  stylesCompress,
  scriptCompress,
  imageFunc,
  cleanMap
); //本番用に出力（本番環境）
