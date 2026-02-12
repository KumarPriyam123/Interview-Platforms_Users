// Example: Using both MongoDB and PostgreSQL together

import { User } from '../models/user.model.js';
import { query } from '../db/postgres.js';

// Example 1: Store user auth in MongoDB, application data in PostgreSQL
const createUserWithProfile = async (userData) => {
    // Store auth data in MongoDB
    const mongoUser = await User.create({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        role: userData.role
    });

    // Store profile data in PostgreSQL
    const result = await query(
        'INSERT INTO user_profiles (mongo_user_id, full_name, phone) VALUES ($1, $2, $3) RETURNING *',
        [mongoUser._id.toString(), userData.fullName, userData.phone]
    );

    return { mongoUser, profile: result.rows[0] };
};

// Example 2: MongoDB for logs, PostgreSQL for transactions
const createJobApplication = async (jobId, userId, resumeUrl) => {
    // Store application in PostgreSQL (transactional data)
    const application = await query(
        'INSERT INTO applications (job_id, user_id, resume_url, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [jobId, userId, resumeUrl, 'pending']
    );

    // Log the action in MongoDB (flexible schema for analytics)
    await ApplicationLog.create({
        applicationId: application.rows[0].id,
        userId,
        action: 'applied',
        metadata: { jobId, timestamp: new Date() }
    });

    return application.rows[0];
};

// Example 3: Use PostgreSQL for complex queries, MongoDB for user data
const getJobsWithUserDetails = async (userId) => {
    // Get user from MongoDB
    const user = await User.findById(userId).select('-password');

    // Get jobs from PostgreSQL (better for joins and complex queries)
    const jobs = await query(`
        SELECT j.*, c.name as company_name
        FROM jobs j
        LEFT JOIN companies c ON j.company_id = c.id
        WHERE j.status = 'active'
        ORDER BY j.created_at DESC
        LIMIT 20
    `);

    return { user, jobs: jobs.rows };
};

export { createUserWithProfile, createJobApplication, getJobsWithUserDetails };
