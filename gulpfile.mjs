import gulp from 'gulp';
import { deleteAsync } from 'del';
import rename from 'gulp-rename';
import jeditor from 'gulp-json-editor';
import replace from 'gulp-replace';

function change_file_ext() {
	return gulp
		.src('pkg/lib/*.d.ts', { base: '.' })
		.pipe(rename((path) => (path.basename = path.basename.replace('.d', ''))))
		.pipe(gulp.dest('.'));
}

function delete_file() {
	return deleteAsync(['pkg/lib/*.{d.ts,js}']);
}

function edit_package() {
	return gulp
		.src('pkg/package.json', { base: '.' })
		.pipe(
			jeditor(
				{
					name: 'bedrock-vanilla-data-inline',
					description: 'Make the @minecraft/vanilla-data declared enumerations convert to constant enumerations.',
					contributors: [{ name: 'lxhzzy06', email: 'lxhzzy@outlook.com' }],
					types: undefined,
					exports: './lib/index.ts'
				},
				{},
				{ arrayMerge: (_, sourceArray) => sourceArray }
			)
		)
		.pipe(gulp.dest('.'));
}

export function set_README() {
	return gulp.src('README.md').pipe(gulp.dest('pkg', { overwrite: true }));
}

function set_constant_enum() {
	return gulp
		.src('pkg/lib/*.ts', { base: '.' })
		.pipe(replace('export declare enum', 'export const enum', { skipBinary: false }))
		.pipe(gulp.dest('.'));
}

export default gulp.series(edit_package, change_file_ext, delete_file, set_constant_enum, set_README);
