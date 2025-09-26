const gulp = require('gulp');

// Copy SVG icons from nodes
gulp.task('build:icons', () => {
    return gulp.src('nodes/**/*.svg')
        .pipe(gulp.dest('dist/nodes'));
});

// Copy credential icons if any
gulp.task('build:credentials', () => {
    return gulp.src('credentials/**/*.svg')
        .pipe(gulp.dest('dist/credentials'));
});

// Default build task
gulp.task('build', gulp.parallel('build:icons', 'build:credentials'));

// Handle errors
gulp.on('error', (err) => {
    console.error('Gulp error:', err);
    process.exit(1);
});
