(function () {
  let selectedRating = 0;
  const stars = document.querySelectorAll('.wr-star');
  const textarea = document.querySelector('.wr-textarea');
  const submit = document.querySelector('.wr-submit');

  function paintStars(value) {
    stars.forEach((star, index) => {
      star.classList.toggle('active', index < value);
    });
  }

  stars.forEach(star => {
    star.addEventListener('mouseover', () => paintStars(Number(star.dataset.val)));
    star.addEventListener('mouseout', () => paintStars(selectedRating));
    star.addEventListener('click', () => {
      selectedRating = Number(star.dataset.val);
      paintStars(selectedRating);
    });
  });

  function notify(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getInitials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('') || 'CU';
  }

  function getCustomerName() {
    const savedCustomer = JSON.parse(localStorage.getItem('khojDemoCustomer') || 'null');
    return savedCustomer?.name || 'KHOJ Customer';
  }

  function renderReviewCard(review, prepend = true) {
    const grid = document.querySelector('.testimonials-grid');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'testi-card latest-review-card';
    card.innerHTML = `
      <div class="testi-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
      <p>"${escapeHtml(review.comment)}"</p>
      <div class="testi-author">
        <div class="testi-avatar">${escapeHtml(getInitials(review.customerName))}</div>
        <div>
          <div class="testi-name">${escapeHtml(review.customerName)}</div>
          <div class="testi-loc">Latest customer review</div>
        </div>
      </div>
    `;

    if (prepend) grid.prepend(card);
    else grid.appendChild(card);
  }

  function saveLocalReview(review) {
    const reviews = JSON.parse(localStorage.getItem('khojLatestReviews') || '[]');
    reviews.unshift(review);
    localStorage.setItem('khojLatestReviews', JSON.stringify(reviews.slice(0, 6)));
  }

  function loadLocalReviews() {
    const reviews = JSON.parse(localStorage.getItem('khojLatestReviews') || '[]');
    reviews.slice().reverse().forEach(review => renderReviewCard(review, true));
  }

  async function submitReview(payload) {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Review failed');
    const data = await response.json();
    notify('khoj:review:submitted', data);
    return data;
  }

  if (submit && textarea) {
    submit.addEventListener('click', async () => {
      const comment = textarea.value.trim();
      const bookingId = submit.dataset.bookingId;

      if (!selectedRating) {
        alert('Please select a star rating.');
        return;
      }
      if (!comment) {
        alert('Please write a review.');
        return;
      }

      if (bookingId) {
        try {
          const data = await submitReview({ bookingId, rating: selectedRating, comment, title: 'KHOJ customer review' });
          const review = {
            rating: data.review.rating,
            comment: data.review.comment,
            customerName: getCustomerName(),
            createdAt: new Date().toISOString()
          };
          renderReviewCard(review);
          saveLocalReview(review);
          alert('Thank you. Your review has been saved.');
        } catch (error) {
          alert(error.message);
          return;
        }
      } else {
        const review = {
          rating: selectedRating,
          comment,
          customerName: getCustomerName(),
          createdAt: new Date().toISOString()
        };
        renderReviewCard(review);
        saveLocalReview(review);
        notify('khoj:review:submitted', { review });
        alert(`Thank you for your ${selectedRating}-star review. It will appear after moderation.`);
      }

      textarea.value = '';
      selectedRating = 0;
      paintStars(0);
    });
  }

  loadLocalReviews();

  window.KhojReviewsRatings = { submitReview, renderReviewCard };
})();
