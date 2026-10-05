const db = require('../db/database');

const depreciationService = {
  calculateSchedule(asset) {
    const cost = Number(asset.acquisition_cost || asset.purchase_price || 0);
    const residual = Number(asset.residual_value || 0);
    const lifeYears = Math.max(1, Number(asset.useful_life_years || 5));
    const method = asset.depreciation_method || 'straight_line';
    const acqYear = asset.acquisition_date ? new Date(asset.acquisition_date).getFullYear() : new Date().getFullYear();

    const schedule = [];
    let currentBookValue = cost;
    let accumulatedDep = 0;

    if (method === 'none' || cost <= 0) {
      return [{
        year: acqYear,
        opening_value: cost,
        depreciation: 0,
        closing_value: cost,
        accumulated: 0
      }];
    }

    if (method === 'reducing_balance') {
      const rate = residual > 0 && cost > residual
        ? (1 - Math.pow(residual / cost, 1 / lifeYears))
        : (1 / lifeYears) * 1.5;

      for (let y = 1; y <= lifeYears; y++) {
        const opening = currentBookValue;
        let dep = opening * rate;
        if (opening - dep < residual) {
          dep = Math.max(0, opening - residual);
        }
        const closing = Math.max(residual, opening - dep);
        accumulatedDep += dep;
        currentBookValue = closing;

        schedule.push({
          year: acqYear + y - 1,
          financial_year: `${acqYear + y - 1}/${acqYear + y}`,
          opening_value: Math.round(opening),
          depreciation: Math.round(dep),
          closing_value: Math.round(closing),
          accumulated: Math.round(accumulatedDep)
        });

        if (closing <= residual) break;
      }
    } else {
      // Default: straight_line
      const depreciableAmount = Math.max(0, cost - residual);
      const annualDep = depreciableAmount / lifeYears;

      for (let y = 1; y <= lifeYears; y++) {
        const opening = currentBookValue;
        const dep = Math.min(annualDep, Math.max(0, opening - residual));
        const closing = Math.max(residual, opening - dep);
        accumulatedDep += dep;
        currentBookValue = closing;

        schedule.push({
          year: acqYear + y - 1,
          financial_year: `${acqYear + y - 1}/${acqYear + y}`,
          opening_value: Math.round(opening),
          depreciation: Math.round(dep),
          closing_value: Math.round(closing),
          accumulated: Math.round(accumulatedDep)
        });
      }
    }

    return schedule;
  },

  calculateCurrentValue(asset) {
    if (!asset.acquisition_date) {
      return {
        current_book_value: asset.acquisition_cost || 0,
        accumulated_depreciation: 0
      };
    }

    const cost = Number(asset.acquisition_cost || asset.purchase_price || 0);
    const residual = Number(asset.residual_value || 0);
    const lifeYears = Math.max(1, Number(asset.useful_life_years || 5));
    const acqDate = new Date(asset.acquisition_date);
    const now = new Date();

    const diffMonths = Math.max(0, (now.getFullYear() - acqDate.getFullYear()) * 12 + (now.getMonth() - acqDate.getMonth()));
    const totalMonths = lifeYears * 12;

    if (diffMonths === 0) {
      return {
        current_book_value: cost,
        accumulated_depreciation: 0
      };
    }

    const depreciable = Math.max(0, cost - residual);
    const monthlyRate = depreciable / totalMonths;
    const accumulated = Math.min(depreciable, Math.round(monthlyRate * diffMonths));
    const currentBookValue = Math.max(residual, cost - accumulated);

    return {
      current_book_value: currentBookValue,
      accumulated_depreciation: accumulated
    };
  },

  runInstitutionalDepreciation(financialYear, userId = 1) {
    const assets = db.query(`
      SELECT * FROM assets
      WHERE status NOT IN ('disposed', 'retired')
        AND acquisition_cost > 0
    `);

    let processed = 0;
    let totalDep = 0;

    db.transaction(() => {
      for (const asset of assets) {
        const schedule = this.calculateSchedule(asset);
        // Find matching FY or compute current year portion
        const record = schedule.find(s => s.financial_year === financialYear) || schedule[0];
        if (record && record.depreciation > 0) {
          // Check if already posted for this FY
          const exists = db.get(`
            SELECT id FROM depreciation_records
            WHERE asset_id = ? AND financial_year = ?
          `, [asset.id, financialYear]);

          if (!exists) {
            db.run(`
              INSERT INTO depreciation_records (
                asset_id, financial_year, period_date, depreciation_method,
                opening_value, depreciation_amount, closing_value, calculated_by
              ) VALUES (?, ?, date('now'), ?, ?, ?, ?, ?)
            `, [
              asset.id,
              financialYear,
              asset.depreciation_method || 'straight_line',
              record.opening_value,
              record.depreciation,
              record.closing_value,
              userId
            ]);

            db.run(`
              UPDATE assets
              SET current_book_value = ?,
                  accumulated_depreciation = ?,
                  last_depreciation_date = date('now')
              WHERE id = ?
            `, [record.closing_value, record.accumulated, asset.id]);

            processed++;
            totalDep += record.depreciation;
          }
        }
      }
    });

    return { processed, totalDepreciation: totalDep, financialYear };
  }
};

module.exports = depreciationService;
