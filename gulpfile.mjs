import gulp from 'gulp';
import { deleteAsync } from 'del';
import rename from 'gulp-rename';

function change_file_ext() {
	return gulp.src('pkg/lib/*.d.ts').pipe(
		rename((path) => {
			path.basename = path.basename.replace('.d', '');
			path.extname = '.ts';
		})
	);
}

function delete_file() {
	return deleteAsync(['pkg/lib/*.{d.ts,js}']);
}

export default gulp.series(change_file_ext, delete_file);

