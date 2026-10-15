# NEWARO v24 — final package update and verification notes

This package preserves the existing NEWARO v24 app structure, Firebase project configuration, API integrations, server, and existing features. It does not replace the app with a new scaffold.

## Included updates

- Added `/apps` with published app directory, app submission form, URL validation, pending status, and admin publish/reject moderation.
- Added `/booking` for published bus/hotel/ride services and pending booking requests.
- Added live Firestore bus-trip feed, bus number/route/driver details, latest GPS link, and assigned-driver GPS publishing while the driver's page is open and location permission is granted.
- Added admin controls on the booking page to publish services and create bus trips. A bus trip must include the driver's Firebase Authentication UID.
- Added Apps and Bus/Booking to the main navigation and global search; added Apps/Booking/Buses to admin counts and exports.
- Added Firestore rules for app submissions/moderation, published booking services, customer booking requests, bus GPS updates, and coin transaction history.
- Changed wallet coin updates to use Firestore transactions, stop showing localStorage as the authoritative balance, validate redeem codes against Firestore, record transaction history, and prevent duplicate target claims through transaction checks.
- Daily bonus now checks a Firestore date marker rather than relying only on localStorage. Removed the duplicate quest credit in the wallet UI.
- Added SEO metadata for Apps and Booking.

## Firestore setup

Deploy the updated `firestore.rules` after reviewing it against your existing production rules. Keep a backup of the currently deployed rules before replacing them.

### `apps`
- User submission fields: `name`, `description`, `category`, `url`, `logoUrl`, `status: "pending"`, `pinned: false`, `ownerUid`, `ownerEmail`, `createdAt`, `updatedAt`.
- Only admins can publish/reject listings. Published listings use `status: "published"`.

### `booking_services`
- Admin-created fields: `name`, `type` (`bus`, `hotel`, `ride`), `description`, `location`, `destination` (optional), `price`, `currency`, `imageUrl`, `operatorName`, `ownerUid`, `status: "published"`, timestamps.

### `bookings`
- Customer-created requests use `serviceId`, `serviceName`, `serviceType`, `customerUid`, optional date/pickup/destination/guests/note, `status: "pending"`, and timestamps.
- A request is not a confirmed reservation or payment.

### `bus_trips`
- Admin-created fields: `busNumber`, `route`, `driverName`, `driverUid`, `driverPhoto`, `status` (`scheduled` or `running`), timestamps.
- The assigned driver can update only `currentLocation: {lat, lng}` and `locationUpdatedAt`. The browser must stay open while sharing. Permission prompts are controlled by the browser/OS; a website cannot force the permission to remain granted.

## Important wallet security limitation

The existing app's Firestore rules permit a signed-in user to update their own `giftCoins` field. Transaction-based UI code helps prevent race conditions and accidental duplicate rewards, but **it does not stop a technically capable user from tampering with client requests while that rule remains permissive**. Before handling real-value rewards, voucher discounts, or payments, move coin mutations to a trusted server endpoint using Firebase Admin credentials and deny direct client writes to `giftCoins`, `redeemedCodes`, and related reward fields. No service-account credentials were present in the uploaded archive, so this package does not pretend that trusted server-side wallet enforcement has been configured.

## Verification status

- Parsed the modified TypeScript/TSX files with the TypeScript parser: syntax passed for the changed app, booking, search, wallet, route, layout, and admin files.
- A full `npm ci`, `npm run build`, and `npm run lint` could not be completed in this environment because dependency installation timed out. Do not treat this as a successful production build.
- Firebase authentication, Firestore rules deployment, app moderation, booking requests, driver GPS, and real-time updates still require testing in your own Firebase project after deploying the rules.

## Recommended pre-upload commands

```bash
npm ci
npm run check:syntax
npm run lint
npm run build
```

Before deploying, configure your server-only secrets in `.env.local`/hosting environment. Never commit `.env.local` or service-account private keys. Rotate any AI/API key that was exposed in an earlier archive.
