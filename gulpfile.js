require('babel/register');

/* DEPENDENCIES */
var gulp = require('gulp'),
    path = require('path'),
    fs = require('fs'),
    glob = require('glob'),
    del = require('del'),
    rename = require('gulp-rename'),
    runSequence = require('run-sequence'),
    sourcemaps = require('gulp-sourcemaps'),
    size = require('gulp-size'),
    eslint = require('gulp-eslint'),
    babelify = require('babelify'),
    browserify = require('browserify'),
    factor = require('factor-bundle'),
    source = require('vinyl-source-stream'),
    uglify = require('gulp-uglify');

/* PATHS */
var src = {
        root: './src/',
        scripts: {
            all : './src/scripts/**/*.js',
            singleEntry: './src/scripts/entry.js',
            multipleEntriesGlob: './src/scripts/*.js'
        }
    },
    dest = {
        build: {
            root: './build/',
            scripts: './build/scripts/'
        },
        dist: {
            root: './dist/',
            scripts: './dist/scripts/'
        }
    };

// Search for JS src files and set `multipleEntries` and `multipleOutputs`
function setSrcScripts() {
    return new Promise(function (resolve, reject) {
        glob(src.scripts.multipleEntriesGlob, function (err, srcFiles) {
            if (err) {
                reject(err);
            }

            src.scripts.multipleEntries = srcFiles.map(function (filePath) {
                return src.root + 'scripts/' + path.basename(filePath);
            });

            src.scripts.multipleOutputs = srcFiles.map(function (filePath) {
                return dest.build.scripts + path.basename(filePath);
            });

            resolve(src.scripts)
        });
    });
}

/* SCRIPTS */
gulp.task('scripts-lint', function () {
    return gulp.src([src.scripts.all])
        .pipe(eslint())
        .pipe(eslint.format());
});

// Bundle for a single entry point.
// Output: single file (`app.js`).
gulp.task('scripts-bundle', function () {
    return browserify({
        entries: src.scripts.singleEntry,
        debug: true
    })
    .transform(babelify)
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest(dest.build.scripts));
});

// Bundle for multiple entry points.
// Output: different specific files + common modules (`common.js`).
gulp.task('setSrcPath', function (callback) {
    setSrcScripts()
    .then(function () {
        // `factor-bundle` doesn't create output directories so…
        fs.mkdir(dest.build.scripts, function (err) {
            if (err) {
                throw err;
            }

            callback();
        });
    });
});

gulp.task('scripts-factor-bundle', ['setSrcPath', ], function () {
    return browserify({
        entries: src.scripts.multipleEntries,
        debug: true
    })
    .plugin(factor, {
        outputs: src.scripts.multipleOutputs
    })
    .transform(babelify)
    .bundle()
    .pipe(source('common.js'))
    .pipe(gulp.dest(dest.build.scripts));
});

gulp.task('scripts-minify', function () {
    return gulp.src(dest.build.scripts + '*.js')
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(size({
            title: 'Minified JS',
            pretty: true
        }))
        .pipe(rename(function (path) {
            path.basename += ".min";
        }))
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(dest.dist.scripts));
});

/* BUILD */
gulp.task('scripts-build', function () {
    runSequence('scripts-lint', 'scripts-factor-bundle');
});

gulp.task('clean-build', function () {
    del([dest.build.root + '*']);
});

gulp.task('build', function () {
    runSequence('clean-build', 'scripts-build');
});

/* DIST */
gulp.task('scripts-dist', function () {
    runSequence('scripts-minify');
});

gulp.task('clean-dist', function () {
    del([dest.dist.root + '*']);
});

gulp.task('dist', function () {
    runSequence('clean-dist', 'scripts-dist');
});

/* WATCH */
gulp.task('watch', function () {
    gulp.start('build')
    gulp.watch(src.scripts.all, ['scripts-build']);
});
