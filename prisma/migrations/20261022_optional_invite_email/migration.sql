-- Open invites: an admin can mint a link without an email address. The
-- invitee supplies their own address when they claim it.
ALTER TABLE "invite" ALTER COLUMN "email" DROP NOT NULL;
