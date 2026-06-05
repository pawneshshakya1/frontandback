const apiResponse = (req, res, next) => {
    res.sendSuccess = (data, message = "Success", statusCode = 200) => {
        return res.status(statusCode).json({ success: true, message, data, error: null });
    };

    res.sendError = (error, message = "An error occurred", statusCode = 500) => {
        // Flatten Zod errors if present
        let parsedError = error;
        if (error && error.name === 'ZodError') {
            parsedError = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        } else if (error && error.message) {
            parsedError = error.message;
        }

        return res.status(statusCode).json({ success: false, message, data: null, error: parsedError });
    };

    next();
};

module.exports = apiResponse;
