fn lookAt(direction: vec3<f32>, up: vec3<f32>) -> mat3x3<f32> {
	var direction_var = direction;
	if (direction_var.x * direction_var.x + direction_var.y * direction_var.y + direction_var.z * direction_var.z == 0.) {
		direction_var.z = 1.;
	}
	direction_var = normalize(direction_var);
	var x: vec3<f32> = cross(up, direction_var);
	if (x.x * x.x + x.y * x.y + x.z * x.z == 0.) {
		if (abs(up.z) == 1.) {
			direction_var.x = direction_var.x + (0.0001);
		} else { 
			direction_var.z = direction_var.z + (0.0001);
		}
		x = cross(up, direction_var);
	}
	x = normalize(x);
	return mat3x3<f32>(x, cross(direction_var, x), direction_var);
}