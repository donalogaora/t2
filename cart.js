<script>
  // Add an item to the cart and store it
  function addToCart(id, name, color, price, qty = 1, image = '') {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push({ id, name, color, price, qty, image });
    localStorage.setItem('cart', JSON.stringify(cart));
    alert(`${name} (${color}) added to cart.`);
  }

  // Get cart items (used on checkout page)
  function getCartItems() {
    return JSON.parse(localStorage.getItem('cart')) || [];
  }

  // Clear cart (after successful checkout)
  function clearCart() {
    localStorage.removeItem('cart');
  }
</script>
