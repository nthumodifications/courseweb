# Class pages

Class pages let opted-in students find classmates and share course links. They are available only for course offerings joined by the student.

## Data stored

Secure-api stores an optional profile in Postgres: display name, department, year, up to four contact links or handles, and a visibility flag for each field. No profile is created until the student saves the opt-in form. Membership rows store the semester, course ID, a self-declared marker, and the optional project-partner flag. Shared links store their label, HTTPS URL, author, and moderation state. Reports store their reason, optional note, course offering, and an internal target account reference for moderation. Blocks store the two internal account references.

The service uses the existing secure-api user storage path to check the signed-in student's `courses` timetable value. It does not create a second timetable copy. The current system has no server-side CCXP enrollment signal for a student's individual course list; every membership is therefore self-declared, and the class page labels it that way.

## Who sees what

- Only the profile owner can view or edit the complete profile and visibility settings.
- A class member can see the opted-in members and visible shared links for a course only while that course is in their own server-stored timetable and they have joined that offering.
- Classmates see only profile fields whose visibility flags are on. Hidden fields are omitted from the class-page response.
- Class-page responses use opaque membership and link IDs. They do not return account IDs, student IDs, or email addresses.
- A block hides both students from each other's member lists and removes their links from each other's class pages.
- Admin staff can review report details and take moderation actions. Admin actions are recorded in `AdminAuditLog`.

## Retention and leaving

Profiles, memberships, and links remain until their owner leaves, removes them, or an administrator hides a link. The service does not automatically remove memberships when a timetable changes; the timetable check prevents access until the course is present again. Abuse reports are retained for moderation and audit purposes, including an internal target account reference visible only to staff. Blocks remain until the blocker removes them.

The profile settings' **Leave class pages** action performs one database transaction that deletes the profile, all of the student's class memberships, and every link they authored. Removing a membership also removes links attached to that membership. Leaving keeps existing abuse reports and their internal target reference for moderation; students cannot see that reference.
