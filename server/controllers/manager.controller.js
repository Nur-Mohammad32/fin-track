import SystemUser from "../models/systemUser.model.js";

export const getMyProfile = async (req, res, next) => {
    try {
        const manager = await SystemUser.findById(req.user.id).select("-password");

        if (!manager) {
            return res.status(404).json({
                success: false,
                message: "Manager not found"
            });
        }

        res.status(200).json({
            success: true,
            manager
        });
    } catch (error) {
        next(error);
    }
};


export const updateMyProfile = async (req, res, next) => {
    try {
        const { fullName } = req.body;

        const manager = await SystemUser.findById(req.user.id);

        if (!manager) {
            return res.status(404).json({
                success: false,
                message: "Manager not found"
            });
        }

        if (fullName !== undefined) {
            manager.fullName = fullName;
        }

        await manager.save();

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            manager: {
                id: manager._id,
                fullName: manager.fullName,
                email: manager.email,
                role: manager.role
            }
        });
    } catch (error) {
        next(error);
    }
};


export const getAllManagers = async (req, res, next) => {
    try {
        const managers = await SystemUser
            .find({ role: "manager" })
            .select("-password");

        res.status(200).json({
            success: true,
            count: managers.length,
            managers
        });
    } catch (error) {
        next(error);
    }
};


export const getManagerById = async (req, res, next) => {
    try {
        const manager = await SystemUser
            .findOne({
                _id: req.params.id,
                role: "manager"
            })
            .select("-password");

        if (!manager) {
            return res.status(404).json({
                success: false,
                message: "Manager not found"
            });
        }

        res.status(200).json({
            success: true,
            manager
        });
    } catch (error) {
        next(error);
    }
};


export const deleteManagerById = async (req, res, next) => {
    try {
        const manager = await SystemUser.findOne({
            _id: req.params.id,
            role: "manager"
        });

        if (!manager) {
            return res.status(404).json({
                success: false,
                message: "Manager not found"
            });
        }

        await SystemUser.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Manager deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};
