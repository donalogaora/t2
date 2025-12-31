let cart = JSON.parse(localStorage.getItem('cart')) || [];
const BACKEND_URL = 'https://api-shop-checkout.donalogaora.com';

async function fetchPostage(subtotal) {
  try {
	const response = await fetch(`${BACKEND_URL}/calculate-postage`, {
	  method: 'POST',
	  headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify({ subtotal })
	});
	const data = await response.json();
	return data.postage ?? 0;
  } catch (err) {
	console.error('Postage fetch failed', err);
	return 0;
  }
}

async function renderCart() {
  const cartItemsContainer = document.getElementById('cart-items');
  const totalEl = document.querySelector('.text-3-4 span');

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
	cartItemsContainer.innerHTML = '<p class="empty-message">Your cart is empty.</p>';
	totalEl.textContent = '0.00';
	return;
  }

  cartItemsContainer.innerHTML = '';
  let subtotal = 0;

  cart.forEach(item => {
    const li = document.createElement('li');
    li.className = 'cart-item';

    li.innerHTML = `
	  <img class="cart-item-image"
	  	   src="${item.image || ''}"
	  	   alt="${item.name} - ${item.colour}">

	  <div class="item-details">
	    <div class="product-description-bold">${item.name}</div>

	    <div class="cart-item-meta">
		  Colour: ${item.colour}
	    </div>

	    <div class="cart-item-meta">
		  Material: ${item.material}
	    </div>

	    <div class="cart-item-meta">
		  Price: €${item.price.toFixed(2)} x ${item.qty}
	    </div>
	  </div>

	  <button class="remove-btn"
			  data-id="${item.id}"
			  data-colour="${item.colour}">
	    Remove
	  </button>
    `;

  cartItemsContainer.appendChild(li);
  subtotal += item.price * item.qty;
});

  const postage = await fetchPostage(subtotal);
  const total = subtotal + postage;

  totalEl.textContent = total.toFixed(2);
}

document.getElementById('cart-items').addEventListener('click', (event) => {
  if (event.target.classList.contains('remove-btn')) {
	const id = event.target.getAttribute('data-id');
	const colour = event.target.getAttribute('data-colour');

	// Find the item index
	const index = cart.findIndex(item => item.id === id && item.colour === colour);
	if (index > -1) {
	  if (cart[index].qty > 1) {
		cart[index].qty -= 1;  // Just reduce qty by 1
	  } else {
		cart.splice(index, 1);  // Remove item if qty reaches 0
	  }
	  localStorage.setItem('cart', JSON.stringify(cart));
	  renderCart();
	}
  }
});

const promoCodes = JSON.parse(localStorage.getItem('promoCodes')) || []; //['WELCOME', 'HI10']
//const promoCodes = ['WELCOME10', 'FREESHIP'];

paypal.Buttons({
  createOrder: function(data, actions) {
	const orderItems = cart.map(item => ({
	  productId: item.id,
	  quantity: item.qty,
	  colour: item.colour, // include colour here
	  material: item.material
	}));

	return fetch(`${BACKEND_URL}/create-order`, {
	  method: 'POST',
	  headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify({
		items: orderItems,
		promoCodes
	  })
	})
	.then(res => res.json())
	.then(data => {
	  if (!data.id) throw new Error('No order ID from backend');
	  return data.id;
	});
  },

  onApprove: function(data) {
	return fetch(`${BACKEND_URL}/capture-order`, {
	  method: 'POST',
	  headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify({ orderId: data.orderID })
	})
	.then(res => res.json())
	.then(details => {
	  if (details.status === 'COMPLETED') {
		alert(`Thank you, ${details.payer.name.given_name}! Your order is confirmed.`);
		localStorage.removeItem('cart');
		window.location.href = `thank-you/index.html?name=${encodeURIComponent(details.payer.name.given_name)}`;
	  } else {
		alert('Payment not completed');
	  }
	})
	.catch(err => {
	  console.error(err);
	  alert('Payment failed. Please try again.');
	});
  },

  onError: function(err) {
	console.error('PayPal error', err);
	alert('An error occurred with PayPal.');
  }
}).render('#paypal-button-container');

renderCart();