<?php
/**
 * Reference solution (never shown to agents): B2B applications with company +
 * VAT, admin approval on the user profile, and a per-product B2B price for
 * approved customers. Proves the task and the staging check are sound.
 */

add_action( 'woocommerce_register_form', function () {
	?>
	<p class="form-row"><label><input type="checkbox" name="b2b_apply" value="1"> Apply for a B2B account</label></p>
	<p class="form-row"><label for="b2b_company">Company name</label><input type="text" class="input-text" name="b2b_company" id="b2b_company"></p>
	<p class="form-row"><label for="b2b_vat">VAT number</label><input type="text" class="input-text" name="b2b_vat" id="b2b_vat"></p>
	<?php
} );

add_action( 'woocommerce_register_post', function ( $username, $email, $errors ) {
	if ( ! empty( $_POST['b2b_apply'] ) && ( empty( $_POST['b2b_company'] ) || empty( $_POST['b2b_vat'] ) ) ) {
		$errors->add( 'b2b', 'Company name and VAT number are required for a B2B account.' );
	}
}, 10, 3 );

add_action( 'woocommerce_created_customer', function ( $user_id ) {
	if ( empty( $_POST['b2b_apply'] ) ) {
		return;
	}
	update_user_meta( $user_id, 'billing_company', sanitize_text_field( wp_unslash( $_POST['b2b_company'] ) ) );
	update_user_meta( $user_id, 'b2b_vat', sanitize_text_field( wp_unslash( $_POST['b2b_vat'] ) ) );
	update_user_meta( $user_id, 'b2b_status', 'pending' );
} );

// Admin approval: a status field on the user profile.
$b2b_profile = function ( $user ) {
	$status = get_user_meta( $user->ID, 'b2b_status', true );
	echo '<h2>B2B</h2><select name="b2b_status"><option value="">none</option>';
	foreach ( array( 'pending', 'approved' ) as $s ) {
		printf( '<option value="%1$s" %2$s>%1$s</option>', esc_attr( $s ), selected( $status, $s, false ) );
	}
	echo '</select>';
};
add_action( 'show_user_profile', $b2b_profile );
add_action( 'edit_user_profile', $b2b_profile );
add_action( 'edit_user_profile_update', function ( $user_id ) {
	if ( current_user_can( 'edit_user', $user_id ) && isset( $_POST['b2b_status'] ) ) {
		update_user_meta( $user_id, 'b2b_status', sanitize_key( $_POST['b2b_status'] ) );
	}
} );

// B2B price per product (meta _b2b_price), only for approved customers.
add_action( 'woocommerce_product_options_pricing', function () {
	woocommerce_wp_text_input( array( 'id' => '_b2b_price', 'label' => 'B2B price', 'data_type' => 'price' ) );
} );
add_action( 'woocommerce_admin_process_product_object', function ( $product ) {
	if ( isset( $_POST['_b2b_price'] ) ) {
		$product->update_meta_data( '_b2b_price', wc_clean( wp_unslash( $_POST['_b2b_price'] ) ) );
	}
} );
$b2b_price = function ( $price, $product ) {
	if ( is_user_logged_in() && 'approved' === get_user_meta( get_current_user_id(), 'b2b_status', true ) ) {
		$b2b = $product->get_meta( '_b2b_price' );
		if ( '' !== $b2b ) {
			return $b2b;
		}
	}
	return $price;
};
add_filter( 'woocommerce_product_get_price', $b2b_price, 10, 2 );
add_filter( 'woocommerce_product_get_regular_price', $b2b_price, 10, 2 );
