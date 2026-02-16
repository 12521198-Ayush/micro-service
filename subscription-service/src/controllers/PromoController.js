import PromoCode from '../models/PromoCode.js';
import pool from '../config/database.js';
import { cache } from '../config/redis.js';

/**
 * Validate promo code
 */
export const validatePromoCode = async (req, res) => {
  console.log('\n========== VALIDATE PROMO CODE START ==========');

  try {
    const { code, planId, billingCycle } = req.body;

    if (!code || !planId || !billingCycle) {
      return res.status(400).json({
        success: false,
        error: 'Code, plan ID, and billing cycle are required',
      });
    }

    const validation = await PromoCode.validate(code, req.user.id, planId, billingCycle);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: validation.message,
      });
    }

    const promo = validation.promo;

    console.log('✓ Promo code validated');
    console.log('========== VALIDATE PROMO CODE END ==========\n');

    res.status(200).json({
      success: true,
      valid: true,
      data: {
        code: promo.code,
        discountType: promo.discount_type,
        discountValue: parseFloat(promo.discount_value),
        maxDiscountAmount: promo.max_discount_amount ? parseFloat(promo.max_discount_amount) : null,
        description: promo.description,
      },
    });
  } catch (error) {
    console.error('❌ VALIDATE PROMO CODE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate promo code',
    });
  }
};

/**
 * Calculate discount with promo code
 */
export const calculateDiscount = async (req, res) => {
  try {
    const { code, amount } = req.body;

    if (!code || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Code and amount are required',
      });
    }

    const promo = await PromoCode.findByCode(code);

    if (!promo) {
      return res.status(404).json({
        success: false,
        error: 'Promo code not found',
      });
    }

    const calculation = PromoCode.calculateDiscount(promo, parseFloat(amount));

    res.status(200).json({
      success: true,
      data: {
        code: promo.code,
        originalAmount: parseFloat(calculation.original_amount),
        discountAmount: parseFloat(calculation.discount_amount),
        finalAmount: parseFloat(calculation.final_amount),
        currency: 'INR',
      },
    });
  } catch (error) {
    console.error('❌ CALCULATE DISCOUNT ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate discount',
    });
  }
};

/**
 * Get all active promo codes (Public)
 */
export const getActivePromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.getAllActive();

    res.status(200).json({
      success: true,
      count: promoCodes.length,
      data: promoCodes.map(p => ({
        code: p.code,
        description: p.description,
        discountType: p.discount_type,
        discountValue: parseFloat(p.discount_value),
        validUntil: p.valid_until,
      })),
    });
  } catch (error) {
    console.error('❌ GET ACTIVE PROMO CODES ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch promo codes',
    });
  }
};

/**
 * Create new promo code (Admin only)
 */
export const createPromoCode = async (req, res) => {
  console.log('\n========== CREATE PROMO CODE START ==========');
  console.log(`[${new Date().toISOString()}] Create promo code request`);

  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      applicablePlans,
      applicableBillingCycles,
      validFrom,
      validUntil,
      maxUses,
      maxUsesPerUser,
    } = req.body;

    // Validate required fields
    if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
      console.log('❌ VALIDATION FAILED: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Code, discount type, discount value, valid from, and valid until are required',
      });
    }

    // Validate discount type
    if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        error: 'Discount type must be PERCENTAGE or FIXED_AMOUNT',
      });
    }

    // Validate discount value
    if (discountValue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Discount value must be greater than 0',
      });
    }

    // Validate percentage discount
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return res.status(400).json({
        success: false,
        error: 'Percentage discount cannot exceed 100%',
      });
    }

    // Validate dates
    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);

    if (fromDate >= untilDate) {
      return res.status(400).json({
        success: false,
        error: 'Valid until date must be after valid from date',
      });
    }

    console.log('✓ Input validation passed');

    // Check if code already exists
    const existingPromo = await PromoCode.findByCode(code);
    if (existingPromo) {
      console.log('❌ Promo code already exists');
      return res.status(409).json({
        success: false,
        error: 'Promo code already exists',
      });
    }

    // Create promo code
    const promoId = await PromoCode.create({
      code: code.toUpperCase(),
      description,
      discount_type: discountType,
      discount_value: discountValue,
      max_discount_amount: maxDiscountAmount || null,
      applicable_plans: applicablePlans || null,
      applicable_billing_cycles: applicableBillingCycles || null,
      valid_from: fromDate,
      valid_until: untilDate,
      max_uses: maxUses || null,
      max_uses_per_user: maxUsesPerUser || 1,
      is_active: true,
    });

    console.log('✓ Promo code created successfully');
    console.log('Promo ID:', promoId);
    console.log('========== CREATE PROMO CODE END ==========\n');

    res.status(201).json({
      success: true,
      message: 'Promo code created successfully',
      data: {
        id: promoId,
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        validFrom: fromDate,
        validUntil: untilDate,
        maxUses: maxUses || null,
        maxUsesPerUser: maxUsesPerUser || 1,
      },
    });
  } catch (error) {
    console.error('❌ CREATE PROMO CODE ERROR:', error);
    console.log('========== CREATE PROMO CODE END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to create promo code',
    });
  }
};

/**
 * Get all promo codes (Admin only)
 */
export const getAllPromoCodes = async (req, res) => {
  console.log('\n========== GET ALL PROMO CODES START ==========');

  try {
    const connection = await pool.getConnection();
    try {
      const query = `
        SELECT 
          id, code, description, discount_type, discount_value,
          max_discount_amount, applicable_plans, applicable_billing_cycles,
          valid_from, valid_until, max_uses, max_uses_per_user,
          current_uses, is_active, created_at, updated_at
        FROM promo_codes
        ORDER BY created_at DESC
      `;

      const [promoCodes] = await connection.execute(query);

      console.log('✓ Promo codes fetched successfully');
      console.log('Total promo codes:', promoCodes.length);
      console.log('========== GET ALL PROMO CODES END ==========\n');

      res.status(200).json({
        success: true,
        count: promoCodes.length,
        data: promoCodes.map(p => {
          // Safely parse JSON fields
          let applicablePlans = null;
          let applicableBillingCycles = null;

          try {
            if (p.applicable_plans && typeof p.applicable_plans === 'string') {
              applicablePlans = JSON.parse(p.applicable_plans);
            }
          } catch (e) {
            console.warn(`Failed to parse applicable_plans for promo ${p.id}:`, e.message);
          }

          try {
            if (p.applicable_billing_cycles && typeof p.applicable_billing_cycles === 'string') {
              applicableBillingCycles = JSON.parse(p.applicable_billing_cycles);
            }
          } catch (e) {
            console.warn(`Failed to parse applicable_billing_cycles for promo ${p.id}:`, e.message);
          }

          return {
            id: p.id,
            code: p.code,
            description: p.description,
            discountType: p.discount_type,
            discountValue: parseFloat(p.discount_value),
            maxDiscountAmount: p.max_discount_amount ? parseFloat(p.max_discount_amount) : null,
            applicablePlans: applicablePlans,
            applicableBillingCycles: applicableBillingCycles,
            validFrom: p.valid_from,
            validUntil: p.valid_until,
            maxUses: p.max_uses,
            maxUsesPerUser: p.max_uses_per_user,
            currentUses: p.current_uses,
            isActive: p.is_active,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          };
        }),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ GET ALL PROMO CODES ERROR:', error);
    console.log('========== GET ALL PROMO CODES END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch promo codes',
    });
  }
};

/**
 * Get promo code by ID (Admin only)
 */
export const getPromoCodeById = async (req, res) => {
  console.log('\n========== GET PROMO CODE BY ID START ==========');

  try {
    const { promoId } = req.params;

    const promo = await PromoCode.findById(promoId);

    if (!promo) {
      console.log('❌ Promo code not found');
      return res.status(404).json({
        success: false,
        error: 'Promo code not found',
      });
    }

    // Get usage statistics
    const stats = await PromoCode.getUsageStats(promoId);

    // Safely parse JSON fields
    let applicablePlans = null;
    let applicableBillingCycles = null;

    try {
      if (promo.applicable_plans && typeof promo.applicable_plans === 'string') {
        applicablePlans = JSON.parse(promo.applicable_plans);
      }
    } catch (e) {
      console.warn(`Failed to parse applicable_plans:`, e.message);
    }

    try {
      if (promo.applicable_billing_cycles && typeof promo.applicable_billing_cycles === 'string') {
        applicableBillingCycles = JSON.parse(promo.applicable_billing_cycles);
      }
    } catch (e) {
      console.warn(`Failed to parse applicable_billing_cycles:`, e.message);
    }

    console.log('✓ Promo code fetched successfully');
    console.log('========== GET PROMO CODE BY ID END ==========\n');

    res.status(200).json({
      success: true,
      data: {
        id: promo.id,
        code: promo.code,
        description: promo.description,
        discountType: promo.discount_type,
        discountValue: parseFloat(promo.discount_value),
        maxDiscountAmount: promo.max_discount_amount ? parseFloat(promo.max_discount_amount) : null,
        applicablePlans: applicablePlans,
        applicableBillingCycles: applicableBillingCycles,
        validFrom: promo.valid_from,
        validUntil: promo.valid_until,
        maxUses: promo.max_uses,
        maxUsesPerUser: promo.max_uses_per_user,
        currentUses: promo.current_uses,
        isActive: promo.is_active,
        createdAt: promo.created_at,
        updatedAt: promo.updated_at,
        statistics: {
          totalUses: stats.total_uses || 0,
          totalDiscountGiven: parseFloat(stats.total_discount || 0),
          uniqueUsers: stats.unique_users || 0,
        },
      },
    });
  } catch (error) {
    console.error('❌ GET PROMO CODE BY ID ERROR:', error);
    console.log('========== GET PROMO CODE BY ID END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch promo code',
    });
  }
};

/**
 * Update promo code (Admin only)
 */
export const updatePromoCode = async (req, res) => {
  console.log('\n========== UPDATE PROMO CODE START ==========');

  try {
    const { promoId } = req.params;
    const {
      description,
      validFrom,
      validUntil,
      maxUses,
      maxUsesPerUser,
      isActive,
    } = req.body;

    // Check if promo exists
    const promo = await PromoCode.findById(promoId);
    if (!promo) {
      return res.status(404).json({
        success: false,
        error: 'Promo code not found',
      });
    }

    const connection = await pool.getConnection();
    try {
      const updates = [];
      const values = [];

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }

      if (validFrom !== undefined) {
        updates.push('valid_from = ?');
        values.push(new Date(validFrom));
      }

      if (validUntil !== undefined) {
        updates.push('valid_until = ?');
        values.push(new Date(validUntil));
      }

      if (maxUses !== undefined) {
        updates.push('max_uses = ?');
        values.push(maxUses);
      }

      if (maxUsesPerUser !== undefined) {
        updates.push('max_uses_per_user = ?');
        values.push(maxUsesPerUser);
      }

      if (isActive !== undefined) {
        updates.push('is_active = ?');
        values.push(isActive);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      values.push(promoId);
      const query = `UPDATE promo_codes SET ${updates.join(', ')} WHERE id = ?`;

      await connection.execute(query, values);

      // Invalidate cache
      await cache.delete(`promo:${promo.code}`);

      console.log('✓ Promo code updated successfully');
      console.log('========== UPDATE PROMO CODE END ==========\n');

      res.status(200).json({
        success: true,
        message: 'Promo code updated successfully',
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ UPDATE PROMO CODE ERROR:', error);
    console.log('========== UPDATE PROMO CODE END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to update promo code',
    });
  }
};

/**
 * Delete/Deactivate promo code (Admin only)
 */
export const deletePromoCode = async (req, res) => {
  console.log('\n========== DELETE PROMO CODE START ==========');

  try {
    const { promoId } = req.params;

    const promo = await PromoCode.findById(promoId);
    if (!promo) {
      return res.status(404).json({
        success: false,
        error: 'Promo code not found',
      });
    }

    // Deactivate instead of deleting (to preserve history)
    await PromoCode.deactivate(promoId);

    console.log('✓ Promo code deactivated successfully');
    console.log('========== DELETE PROMO CODE END ==========\n');

    res.status(200).json({
      success: true,
      message: 'Promo code deactivated successfully',
    });
  } catch (error) {
    console.error('❌ DELETE PROMO CODE ERROR:', error);
    console.log('========== DELETE PROMO CODE END ==========\n');
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate promo code',
    });
  }
};