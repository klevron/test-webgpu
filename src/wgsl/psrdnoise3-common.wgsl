fn mod289v4f(i: vec4<f32>) -> vec4<f32> {
	return i - floor(i / 289.0) * 289.0;
}

fn permute289v4f(i: vec4<f32>) -> vec4<f32> {
	var im: vec4<f32> = mod289v4f(i);
	return mod289v4f((im*34.0 + 10.0)*im);
}