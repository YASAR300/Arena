const express = require('express');
const router = express.Router({ mergeParams: true });
const { protect } = require('../middlewares/auth.middleware');
const { getSignedUploadUrl, createSubmission, getMySubmission } = require('../controllers/submission.controller');
const { validate, submissionSchema } = require('../middlewares/validate.middleware');

router.get('/signed-url', protect, getSignedUploadUrl);
router.post('/', protect, validate(submissionSchema), createSubmission);
router.put('/', protect, validate(submissionSchema), createSubmission);
router.get('/me', protect, getMySubmission);

module.exports = router;
