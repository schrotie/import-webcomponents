const {dest, series, src} = require('gulp');
const del     = require('del');
const rename  = require('gulp-rename');
const rollup  = require('gulp-better-rollup');
const uglify  = require('gulp-uglify-es').default;

const uglifyOpts = {
	compress: true,
	mangle: true,
};

function cleanUp() {return del(['dist', 'build']);}

function build() {
	return src('import-webcomponents.js')
		.pipe(rollup({}, {format: 'iife'}))
		.pipe(uglify(uglifyOpts))
		.pipe(rename(function(path) {path.extname = '.min.js';}))
		.pipe(dest('.'));
}

exports.default = series(
	cleanUp,
	build
);
