import gulp from 'gulp';

function test(cb) {
	console.log('test');
	cb();
}

function b() {}

export default test;

