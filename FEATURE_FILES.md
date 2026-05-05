# KHOJ Five Feature File Map

Run the full project with:

```bash
npm start
```

Use:

```env
MONGO_URI=mongodb://127.0.0.1:27017/khojdb
PORT=3000
```

## 1. Payment & Refund

Frontend:
- `features/payment-refund.js`

Backend:
- `routes/paymentRoutes.js`
- `controllers/paymentController.js`
- `models/booking.js`

APIs:
- `POST /api/payments/pay`
- `POST /api/payments/refund`
- `POST /api/payments/refund/process`

## 2. Reviews & Ratings

Frontend:
- `features/reviews-ratings.js`

Backend:
- `routes/reviewRoutes.js`
- `controllers/reviewController.js`
- `models/review.js`
- `models/listings.js`
- `models/booking.js`

APIs:
- `POST /api/reviews`
- `GET /api/reviews/listing/:listingId`
- `GET /api/reviews/booking/:bookingId`

## 3. Emergency Services

Frontend:
- `features/emergency-services.js`

Backend:
- `routes/emergencyRoutes.js`
- `controllers/emergencyController.js`
- `models/emergencyContact.js`

APIs:
- `GET /api/emergency/contacts`
- `POST /api/emergency/request`

## 4. Order Status & Tracking

Frontend:
- `features/order-status-tracking.js`

Backend:
- `routes/bookingRoutes.js`
- `controllers/bookingController.js`
- `models/booking.js`

APIs:
- `GET /api/bookings/track/:trackingId`
- `PATCH /api/bookings/:bookingId/status`

## 5. Parcel Tracking

Frontend:
- `features/parcel-tracking.js`

Backend:
- `routes/parcelRoutes.js`
- `controllers/parcelController.js`
- `models/parcel.js`

APIs:
- `GET /api/parcels/track/:parcelId`
- `PUT /api/parcels/track/:parcelId`

## Collaboration Layer

Frontend:
- `features/feature-collaboration.js`

This file listens to browser events from all five feature modules and keeps their latest shared state together without mixing the individual feature logic.
