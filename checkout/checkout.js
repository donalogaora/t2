let cart = JSON.parse(localStorage.getItem('cart')) || [];
const BACKEND_URL = 'https://api-shop-checkout.donalogaora.com';

//async function fetchPostage(subtotal) {
//  try {
//	const response = await fetch(`${BACKEND_URL}/calculate-postage`, {
//	  method: 'POST',
//	  headers: { 'Content-Type': 'application/json' },
//	  body: JSON.stringify({ subtotal })
//	});
//	const data = await response.json();
//	return data.postage ?? 0;
//  } catch (err) {
//	console.error('Postage fetch failed', err);
//	return 0;
//  }
//}

const SHEET_URL = 'https://script.google.com/macros/s/AKfycbz8LydxCL8AZclrYOXVbQjCVcWtp3rzAWNct-tI0Sf2ZNz_j7Zu3invgYMoHEMANlVv/exec?all=true';

async function getProducts() {

  const response = await fetch(SHEET_URL);
  const data = await response.json();

  return parseProducts(data);
}

function parseProducts(data) {

  const products = [];
  const keys = Object.keys(data);
  const productIds = new Set(keys.map(k => k.split('_')[0]));

  productIds.forEach(idPrefix => {

    const product = {
      id: data[`${idPrefix}_id`],
      name: data[`${idPrefix}_product_name`],
      colour: data[`${idPrefix}_colour`] || '',
      description: data[`${idPrefix}_description`] || '',
      price: parseFloat(data[`${idPrefix}_price`]) || 0,
      weight: parseFloat(data[`${idPrefix}_weight`]) || 0,
      package_costs: data[`${idPrefix}_package_costs`] || 0,
    };

    products.push(product);
  });

  return products;
}

async function calculateShipping(cart, registeredPost = false) {

  try {

    const products = await getProducts();

    let subtotal = 0;
    let totalWeight = 0;
    let totalItemCount = 0;

    // Product totals
    for (const item of cart) {

      const product = products.find(p => p.id === item.id);

      if (!product) continue;

      subtotal += product.price * item.qty;
      totalWeight += product.weight * item.qty;
      totalItemCount += item.qty;
    }

    // Envelope
    const envelope = totalItemCount === 1
      ? products.find(p => p.id === '0A')
      : products.find(p => p.id === '0B');

    if (!envelope) {
      return {
        shipping: 0,
        subtotal,
        total: subtotal
      };
    }

    // Add envelope weight
    totalWeight += envelope.weight;

    // Shipping tiers
    const shippingMap = registeredPost
      ? { low: '6C', high: '6D' }
      : { low: '6A', high: '6B' };

    const lowTier = products.find(p => p.id === shippingMap.low);
    const highTier = products.find(p => p.id === shippingMap.high);

    if (!lowTier || !highTier) {

      return {
        shipping: 0,
        subtotal,
        total: subtotal
      };
    }

    let postage = 0;

    if (totalWeight <= lowTier.weight) {
      postage = lowTier.price;
    }
    else if (totalWeight <= highTier.weight) {
      postage = highTier.price;
    }

    const shipping = postage + envelope.price;
    const total = subtotal + shipping;

    return {
      shipping,
      subtotal,
      total
    };

  } catch (err) {

    console.error('Shipping calculation failed', err);

    return {
      shipping: 0,
      subtotal: 0,
      total: 0
    };
  }
}


//end_of_code

async function renderCart() {

  const cartItemsContainer = document.getElementById('cart-items');

  const shippingEl = document.getElementById('shipping-amount');
  const totalEl = document.getElementById('total-amount');

  const shippingCurrency = document.getElementById('shipping-currency');
  const totalCurrency = document.getElementById('total-currency');

  if (!cartItemsContainer) return;

  // ✅ loading state (once only)
  shippingCurrency.style.display = 'none';
  totalCurrency.style.display = 'none';

  shippingEl.textContent = '...';
  totalEl.textContent = '...';

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '<p class="empty-message">Your cart is empty.</p>';

    shippingEl.textContent = '-';
    totalEl.textContent = '-';

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

        <div class="cart-item-meta">Colour: ${item.colour}</div>
        <div class="cart-item-meta">Material: ${item.material}</div>
        <div class="cart-item-meta">Price: €${item.price.toFixed(2)} x ${item.qty}</div>
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

  // ⏳ async shipping calculation
  const totals = await calculateShipping(cart);

  // ✅ show € again
  shippingCurrency.style.display = 'inline';
  totalCurrency.style.display = 'inline';

  // ✅ update final values
  shippingEl.textContent = totals.shipping.toFixed(2);
  totalEl.textContent = totals.total.toFixed(2);
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