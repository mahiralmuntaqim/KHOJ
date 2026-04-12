# KHOJ Merge Plan - TODO Steps

## Status: In Progress

**Completed:**
- [x] Created TODO.md
- [x] Step 1: Updated package.json + npm install
- [x] Step 2: Enhanced models/listings.js
- [x] Step 3: Created models/review.js
- [x] Step 4: Created controllers/authController.js
- [x] Step 5: Created controllers/bookingController.js
- [x] Step 6: Created controllers/paymentController.js
- [x] Step 7: Created controllers/reviewController.js
- [x] Step 8: Created routes/authRoutes.js
- [x] Step 9: Created routes/bookingRoutes.js
- [x] Step 10: Created routes/paymentRoutes.js
- [x] Step 11: Created routes/reviewRoutes.js

**Pending Steps (to be checked off as completed):**

1. [ ] **Update package.json**: Merge dependencies from KHOJ-main/package.json into root (use latest versions).
2. [ ] **Enhance models/listings.js**: Merge advanced fields from KHOJ-main/Database/SRC/SRC/listings.js (description, unit, geoindex, etc.).
3. [ ] **Create models/review.js**: Copy from KHOJ-main/Database/SRC/SRC/review.js.
4. [ ] **Create controllers/authController.js**: Copy/adapt from KHOJ-main/Database/SRC/SRC/controllers/auth.js, use root models.
5. [ ] **Create controllers/bookingController.js**: Copy/adapt from KHOJ-main/Database/SRC/SRC/controllers/booking.js.
6. [ ] **Create controllers/paymentController.js**: Copy/adapt from KHOJ-main/Database/SRC/SRC/controllers/payment.js.
7. [ ] **Create controllers/reviewController.js**: Copy/adapt from KHOJ-main/Database/SRC/SRC/controllers/review.js.
8. [ ] **Create routes/authRoutes.js**: Copy/adapt from KHOJ-main/routes/authRoutes.js, import root controllers/models.
9. [ ] **Create routes/bookingRoutes.js**: Copy/adapt from KHOJ-main/routes/bookingRoutes.js.
10. [ ] **Create routes/paymentRoutes.js**: Copy/adapt from KHOJ-main/routes/paymentRoutes.js.
11. [ ] **Create routes/reviewRoutes.js**: Copy/adapt from KHOJ-main/routes/reviewRoutes.js.
12. [x] **Update server.js**: Add new route mounts (/api/auth, /api/bookings, etc.), static serve, update mongoose connect.
13. [ ] **Install dependencies**: Run `npm install`.
14. [ ] **Test server**: Run `node server.js`, verify no errors.
15. [ ] **Frontend check/merge**: Compare root vs KHOJ-main index.html/script.js/style.css, merge if needed.
16. [ ] **Cleanup**: Delete KHOJ-main/ folder.
17. [ ] **Final test**: Full functionality test (auth, booking, payment, review).

Next step will be indicated after each completion.

