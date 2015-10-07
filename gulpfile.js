require('babel/register');

var gulp = require('gulp'),
    glob = require('glob'),
    path = require('path'),
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
    uglify = require('gulp-uglify'),
    filePaths = {};

function getFileList(dest) {
    var destPath = './' + dest + '/scripts/';

    return new Promise(function (resolve, reject) {
        glob('./src/scripts/*.js', function (err, srcFiles) {
            if (err) {
                reject(err);
            }

            var fileList = srcFiles.map(function (filePath) {
                return destPath + path.basename(filePath);
            });

            resolve(fileList)
        });
    });
}

gulp.task('scripts-lint', function () {
    return gulp.src(['./src/scripts/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format());
});

// Bundle for a single entry point.
// Output: single file (`app.js`).
gulp.task('scripts-bundle', function () {
    return browserify({
        entries: './src/scripts/entry.js',
        debug: true
    })
    .transform(babelify)
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('./dist/scripts'));
});

// Bundle for multiple entry points.
// Output: different specific files + common modules (`common.js`).
gulp.task('setFilesPath', function(callback) {
    Promise.all([getFileList('src'), getFileList('dist')])
    .then(function (fileLists) {
        filePaths.entries = fileLists[0];
        filePaths.outputs = fileLists[1];

        callback();
    });
});

gulp.task('scripts-factor-bundle', ['setFilesPath'], function () {
    return browserify({
        entries: filePaths.entries,
        debug: true
    })
    .plugin(factor, {
        outputs: filePaths.outputs
    })
    .transform(babelify)
    .bundle()
    .pipe(source('common.js'))
    .pipe(gulp.dest('./dist/scripts'));
});

gulp.task('scripts-minify', function () {
    return gulp.src('./dist/scripts/**/*.js')
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
        .pipe(gulp.dest('./dist/scripts'));
});

gulp.task('scripts', function () {
    runSequence('scripts-lint', 'scripts-factor-bundle', 'scripts-minify');
});

gulp.task('watch', function () {
    gulp.watch('./src/scripts/**/*.js', ['clean', 'scripts']);
});

gulp.task('clean', function () {
    del(['./dist/scripts/*']);
});

gulp.task('dist', function () {
    runSequence('clean', 'scripts');
});
