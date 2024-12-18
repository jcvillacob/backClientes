const { getConnection, mssql } = require('../../../../../config/db.js');

/**
 * checkOrderExists(orderNumber)
 * Retorna { exists, currentStatus, existingLabors, existingParts }.
 */
const checkOrderExists = async (orderNumber) => {
  try {
    const pool = await getConnection();
    const query = `
      SELECT O.NumeroOrden, O.Estado, L.IdLabor, P.IdParte
      FROM Dev_CD_Ordenes O
      LEFT JOIN Dev_CD_Labores L ON O.NumeroOrden = L.NumeroOrden
      LEFT JOIN Dev_CD_Partes P ON O.NumeroOrden = P.NumeroOrden
      WHERE O.NumeroOrden = @NumeroOrden
    `;
    const result = await pool
      .request()
      .input('NumeroOrden', mssql.Int, orderNumber)
      .query(query);

    const exists = result.recordset.length > 0;
    const currentStatus = exists ? result.recordset[0].Estado : null;
    const existingLabors = result.recordset
      .map((row) => row.IdLabor)
      .filter((id) => id != null);
    const existingParts = result.recordset
      .map((row) => row.IdParte)
      .filter((id) => id != null);

    return { exists, currentStatus, existingLabors, existingParts };
  } catch (error) {
    console.error('Error al verificar si la orden existe:', error);
    return {
      exists: false,
      currentStatus: null,
      existingLabors: [],
      existingParts: [],
    };
  }
};

/**
 * updateExistingOrder(order, existingInfo)
 * - Actualiza los campos principales de la orden en Dev_CD_Ordenes.
 * - Para cada labor: UPDATE si existe, INSERT si no existe.
 * - Para cada parte: UPDATE si existe, INSERT si no existe.
 */
const updateExistingOrder = async (order, existingInfo) => {
  try {
    const { existingLabors, existingParts } = existingInfo;
    const pool = await getConnection();

    const updateOrderQuery = `
      UPDATE Dev_CD_Ordenes
      SET Estado = @Estado,
          CodigoVehiculo = @CodigoVehiculo,
          FechaServicio = @FechaServicio,
          FechaInicio = @FechaInicio,
          FechaFinEstimada = @FechaFinEstimada,
          Odometro = @Odometro,
          Proveedor = @Proveedor,
          Razon = @Razon,
          TipoMantenimiento = @TipoMantenimiento,
          TipoOrden = @TipoOrden,
          Ciudad = @Ciudad,
          CentroCosto = @CentroCosto,
          GrupoPrincipal = @GrupoPrincipal,
          FechaActualizacion = @FechaActualizacion,
          UsuarioActualizacion = @UsuarioActualizacion,
          TotalCostoManoObra = @TotalCostoManoObra,
          TotalCostoPiezas = @TotalCostoPiezas,
          CostoTotal = @CostoTotal
      WHERE NumeroOrden = @NumeroOrden
    `;

    await pool
      .request()
      .input('NumeroOrden', mssql.Int, order.number)
      .input('Estado', mssql.VarChar, order.status)
      .input('CodigoVehiculo', mssql.VarChar, order.vehicleCode || ' ')
      .input('FechaServicio', mssql.DateTime, order.workshopDate)
      .input('FechaInicio', mssql.DateTime, order.startDate)
      .input('FechaFinEstimada', mssql.DateTime, order.estimatedFinishDate || null)
      .input('Odometro', mssql.Int, order.odometer || 0)
      .input('Proveedor', mssql.VarChar, order.vendor?.name || ' ')
      .input('Razon', mssql.VarChar, order.reason || ' ')
      .input('TipoMantenimiento', mssql.VarChar, order.maintenanceLabels?.join(', ') || ' ')
      .input('TipoOrden', mssql.VarChar, order.type || ' ')
      .input('Ciudad', mssql.VarChar, order.city?.name || ' ')
      .input('CentroCosto', mssql.VarChar, order.costCenter?.name || ' ')
      .input('GrupoPrincipal', mssql.VarChar, order.primaryGroup?.name || ' ')
      .input('FechaActualizacion', mssql.DateTime, order.updatedAt)
      .input('UsuarioActualizacion', mssql.VarChar, order.updatedBy?.name || ' ')
      .input('TotalCostoManoObra', mssql.Int, order.totalCostLabors || 0)
      .input('TotalCostoPiezas', mssql.Int, order.totalCostParts || 0)
      .input('CostoTotal', mssql.Int, order.totalCost || 0)
      .query(updateOrderQuery);

    // Actualizar / Insertar labores
    if (order.labors && order.labors.length > 0) {
      for (const labor of order.labors) {
        if (existingLabors.includes(labor.id)) {
          // UPDATE labor existente
          const updateLaborQuery = `
            UPDATE Dev_CD_Labores
            SET Nombre = @Nombre,
                TipoMantenimiento = @TipoMantenimiento,
                CostoUnitario = @CostoUnitario,
                Cantidad = @Cantidad,
                Descuento = @Descuento,
                Impuesto = @Impuesto,
                CostoTotal = @CostoTotal,
                Sistema = @Sistema,
                Subsistema = @Subsistema,
                CuentaContable = @CuentaContable,
                NumeroFactura = @NumeroFactura,
                Comentario = @Comentario,
                FechaCreacion = @FechaCreacion,
                IdentificacionProveedor = @IdentificacionProveedor,
                Proveedor = @Proveedor
            WHERE IdLabor = @IdLabor AND NumeroOrden = @NumeroOrden
          `;
          await pool
            .request()
            .input('IdLabor', mssql.Int, labor.id)
            .input('NumeroOrden', mssql.Int, order.number)
            .input('Nombre', mssql.VarChar, labor.name)
            .input('TipoMantenimiento', mssql.VarChar, labor.maintenanceType?.name || ' ')
            .input('CostoUnitario', mssql.Int, labor.unitCost || 0)
            .input('Cantidad', mssql.Numeric(18, 2), labor.qty || 0)
            .input('Descuento', mssql.Int, labor.discount || 0)
            .input('Impuesto', mssql.Int, labor.tax || 0)
            .input('CostoTotal', mssql.Int, labor.totalCost || 0)
            .input('Sistema', mssql.VarChar, labor.system?.name || ' ')
            .input('Subsistema', mssql.VarChar, labor.subsystem?.name || ' ')
            .input('CuentaContable', mssql.VarChar, labor.ledgerAccount || ' ')
            .input('NumeroFactura', mssql.VarChar, labor.invoice?.number || ' ')
            .input('Comentario', mssql.VarChar, labor.comment || ' ')
            .input('FechaCreacion', mssql.DateTime, labor.createdAt)
            .input('IdentificacionProveedor', mssql.VarChar, labor.vendor?.identification || ' ')
            .input('Proveedor', mssql.VarChar, labor.vendor?.name || ' ')
            .query(updateLaborQuery);

        } else {
          // INSERT labor nueva
          const insertLaborQuery = `
            INSERT INTO Dev_CD_Labores (
              IdLabor,
              NumeroOrden,
              Nombre,
              TipoMantenimiento,
              CostoUnitario,
              Cantidad,
              Descuento,
              Impuesto,
              CostoTotal,
              Sistema,
              Subsistema,
              CuentaContable,
              NumeroFactura,
              Comentario,
              FechaCreacion,
              IdentificacionProveedor,
              Proveedor
            )
            VALUES (
              @IdLabor,
              @NumeroOrden,
              @Nombre,
              @TipoMantenimiento,
              @CostoUnitario,
              @Cantidad,
              @Descuento,
              @Impuesto,
              @CostoTotal,
              @Sistema,
              @Subsistema,
              @CuentaContable,
              @NumeroFactura,
              @Comentario,
              @FechaCreacion,
              @IdentificacionProveedor,
              @Proveedor
            );
          `;
          await pool
            .request()
            .input('IdLabor', mssql.Int, labor.id)
            .input('NumeroOrden', mssql.Int, order.number)
            .input('Nombre', mssql.VarChar, labor.name)
            .input('TipoMantenimiento', mssql.VarChar, labor.maintenanceType?.name || ' ')
            .input('CostoUnitario', mssql.Int, labor.unitCost || 0)
            .input('Cantidad', mssql.Numeric(18, 2), labor.qty || 0)
            .input('Descuento', mssql.Int, labor.discount || 0)
            .input('Impuesto', mssql.Int, labor.tax || 0)
            .input('CostoTotal', mssql.Int, labor.totalCost || 0)
            .input('Sistema', mssql.VarChar, labor.system?.name || ' ')
            .input('Subsistema', mssql.VarChar, labor.subsystem?.name || ' ')
            .input('CuentaContable', mssql.VarChar, labor.ledgerAccount || ' ')
            .input('NumeroFactura', mssql.VarChar, labor.invoice?.number || ' ')
            .input('Comentario', mssql.VarChar, labor.comment || ' ')
            .input('FechaCreacion', mssql.DateTime, labor.createdAt)
            .input('IdentificacionProveedor', mssql.VarChar, labor.vendor?.identification || ' ')
            .input('Proveedor', mssql.VarChar, labor.vendor?.name || ' ')
            .query(insertLaborQuery);
        }
      }
    }

    // Actualizar / Insertar partes
    if (order.parts && order.parts.length > 0) {
      for (const part of order.parts) {
        if (existingParts.includes(part.id)) {
          // UPDATE parte existente
          const updatePartQuery = `
            UPDATE Dev_CD_Partes
            SET Nombre = @Nombre,
                Codigo = @Codigo,
                CostoUnitario = @CostoUnitario,
                Cantidad = @Cantidad,
                Descuento = @Descuento,
                Impuesto = @Impuesto,
                CostoTotal = @CostoTotal,
                Proveedor = @Proveedor,
                CuentaContable = @CuentaContable,
                NumeroFactura = @NumeroFactura,
                FechaFactura = @FechaFactura,
                FechaPresentacion = @FechaPresentacion,
                Comentario = @Comentario,
                FechaCreacion = @FechaCreacion
            WHERE IdParte = @IdParte AND NumeroOrden = @NumeroOrden
          `;
          await pool
            .request()
            .input('IdParte', mssql.Int, part.id)
            .input('NumeroOrden', mssql.Int, order.number)
            .input('Nombre', mssql.VarChar, part.name)
            .input('Codigo', mssql.VarChar, part.code)
            .input('CostoUnitario', mssql.Int, part.unitCost || 0)
            .input('Cantidad', mssql.Int, part.qty || 0)
            .input('Descuento', mssql.Int, part.discount || 0)
            .input('Impuesto', mssql.Int, part.tax || 0)
            .input('CostoTotal', mssql.Int, part.totalCost || 0)
            .input('Proveedor', mssql.VarChar, part.vendor?.name || ' ')
            .input('CuentaContable', mssql.VarChar, part.ledgerAccount || ' ')
            .input('NumeroFactura', mssql.VarChar, part.invoice?.number || ' ')
            .input('FechaFactura', mssql.VarChar, part.invoice?.date || null)
            .input('FechaPresentacion', mssql.VarChar, part.invoice?.filingDate || null)
            .input('Comentario', mssql.VarChar, part.comment || ' ')
            .input('FechaCreacion', mssql.DateTime, part.createdAt)
            .query(updatePartQuery);
        } else {
          // INSERT parte nueva
          const insertPartQuery = `
            INSERT INTO Dev_CD_Partes (
              IdParte,
              NumeroOrden,
              Nombre,
              Codigo,
              CostoUnitario,
              Cantidad,
              Descuento,
              Impuesto,
              CostoTotal,
              Proveedor,
              CuentaContable,
              NumeroFactura,
              FechaFactura,
              FechaPresentacion,
              Comentario,
              FechaCreacion
            )
            VALUES (
              @IdParte,
              @NumeroOrden,
              @Nombre,
              @Codigo,
              @CostoUnitario,
              @Cantidad,
              @Descuento,
              @Impuesto,
              @CostoTotal,
              @Proveedor,
              @CuentaContable,
              @NumeroFactura,
              @FechaFactura,
              @FechaPresentacion,
              @Comentario,
              @FechaCreacion
            );
          `;
          await pool
            .request()
            .input('IdParte', mssql.Int, part.id)
            .input('NumeroOrden', mssql.Int, order.number)
            .input('Nombre', mssql.VarChar, part.name)
            .input('Codigo', mssql.VarChar, part.code)
            .input('CostoUnitario', mssql.Int, part.unitCost || 0)
            .input('Cantidad', mssql.Int, part.qty || 0)
            .input('Descuento', mssql.Int, part.discount || 0)
            .input('Impuesto', mssql.Int, part.tax || 0)
            .input('CostoTotal', mssql.Int, part.totalCost || 0)
            .input('Proveedor', mssql.VarChar, part.vendor?.name || ' ')
            .input('CuentaContable', mssql.VarChar, part.ledgerAccount || ' ')
            .input('NumeroFactura', mssql.VarChar, part.invoiceNumber || ' ')
            .input('FechaFactura', mssql.VarChar, part.invoice?.date || null)
            .input('FechaPresentacion', mssql.VarChar, part.invoice?.filingDate || null)
            .input('Comentario', mssql.VarChar, part.comment || ' ')
            .input('FechaCreacion', mssql.DateTime, part.createdAt)
            .query(insertPartQuery);
        }
      }
    }

    /* console.log(`Orden ${order.number} actualizada correctamente.`); */
  } catch (error) {
    console.error(`Error al actualizar la orden ${order.number}:`, error);
  }
};

/**
 * insertOrder(order, stats)
 * - Verifica si la orden ya existe (checkOrderExists).
 * - Si existe: updateExistingOrder().
 * - Si no existe: inserta nueva (y también inserta labores/partes).
 * - Actualiza 'stats.newOrders' o 'stats.updatedOrders'.
 */
const insertOrder = async (order, stats) => {
  // stats = { newOrders, updatedOrders }

  try {
    const { exists, currentStatus, existingLabors, existingParts } = await checkOrderExists(order.number);

    if (exists) {
      // Orden existe => UPDATE
      await updateExistingOrder(order, { existingLabors, existingParts });
      stats.updatedOrders++;  // incrementamos contador de actualizadas
      /* console.log(`Orden ${order.number} procesada (actualizada).`); */
    } else {
      // Inserción de una orden totalmente nueva
      const pool = await getConnection();

      const orderInsertQuery = `
      INSERT INTO Dev_CD_Ordenes (
          NumeroOrden,
          CodigoVehiculo,
          FechaServicio,
          FechaInicio,
          FechaFinEstimada,
          Estado,
          Odometro,
          Proveedor,
          Razon,
          TipoMantenimiento,
          TipoOrden,
          Ciudad,
          CentroCosto,
          GrupoPrincipal,
          FechaCreacion,
          UsuarioCreacion,
          AfectaMantenimiento,
          AfectaDisponibilidadVehiculo,
          FechaActualizacion,
          UsuarioActualizacion,
          TotalCostoManoObra,
          TotalCostoPiezas,
          CostoTotal,
          FechaCompletadoTecnico,
          FechaCompletadoFinal,
          UltimaFechaCompletadoTecnico,
          UltimaFechaCompletadoFinal
      )
      VALUES (
          @NumeroOrden,
          @CodigoVehiculo,
          @FechaServicio,
          @FechaInicio,
          @FechaFinEstimada,
          @Estado,
          @Odometro,
          @Proveedor,
          @Razon,
          @TipoMantenimiento,
          @TipoOrden,
          @Ciudad,
          @CentroCosto,
          @GrupoPrincipal,
          @FechaCreacion,
          @UsuarioCreacion,
          @AfectaMantenimiento,
          @AfectaDisponibilidadVehiculo,
          @FechaActualizacion,
          @UsuarioActualizacion,
          @TotalCostoManoObra,
          @TotalCostoPiezas,
          @CostoTotal,
          @FechaCompletadoTecnico,
          @FechaCompletadoFinal,
          @UltimaFechaCompletadoTecnico,
          @UltimaFechaCompletadoFinal
      ); 
      `;

      await pool
        .request()
        .input('NumeroOrden', mssql.Int, order.number)
        .input('CodigoVehiculo', mssql.VarChar, order.vehicleCode || ' ')
        .input('FechaServicio', mssql.DateTime, order.workshopDate)
        .input('FechaInicio', mssql.DateTime, order.startDate)
        .input('FechaFinEstimada', mssql.DateTime, order.estimatedFinishDate || null)
        .input('Estado', mssql.VarChar, order.status)
        .input('Odometro', mssql.Int, order.odometer || 0)
        .input('Proveedor', mssql.VarChar, order.vendor?.name || ' ')
        .input('Razon', mssql.VarChar, order.reason || ' ')
        .input('TipoMantenimiento', mssql.VarChar, order.maintenanceLabels?.join(', ') || ' ')
        .input('TipoOrden', mssql.VarChar, order.type || ' ')
        .input('Ciudad', mssql.VarChar, order.city?.name || ' ')
        .input('CentroCosto', mssql.VarChar, order.costCenter?.name || ' ')
        .input('GrupoPrincipal', mssql.VarChar, order.primaryGroup?.name || ' ')
        .input('FechaCreacion', mssql.DateTime, order.createdAt)
        .input('UsuarioCreacion', mssql.VarChar, order.createdBy?.name || ' ')
        .input('AfectaMantenimiento', mssql.VarChar, order.affectsMaintenanceSchedule ? 'Sí' : 'No')
        .input('AfectaDisponibilidadVehiculo', mssql.VarChar, order.affectsVehicleAvailability ? 'Sí' : 'No')
        .input('FechaActualizacion', mssql.DateTime, order.updatedAt)
        .input('UsuarioActualizacion', mssql.VarChar, order.updatedBy?.name || ' ')
        .input('TotalCostoManoObra', mssql.Int, order.totalCostLabors || 0)
        .input('TotalCostoPiezas', mssql.Int, order.totalCostParts || 0)
        .input('CostoTotal', mssql.Int, order.totalCost || 0)
        .input('FechaCompletadoTecnico', mssql.DateTime, order.technicalCompletionDate || null)
        .input('FechaCompletadoFinal', mssql.DateTime, order.finalCompletionDate || null)
        .input('UltimaFechaCompletadoTecnico', mssql.DateTime, order.lastSystemTechnicalCompletionDate || null)
        .input('UltimaFechaCompletadoFinal', mssql.DateTime, order.lastSystemFinalCompletionDate || null)
        .query(orderInsertQuery);

      // Insertar labores
      if (order.labors && order.labors.length > 0) {
        for (const labor of order.labors) {
          const insertLaborQuery = `
            INSERT INTO Dev_CD_Labores (
              IdLabor,
              NumeroOrden,
              Nombre,
              TipoMantenimiento,
              CostoUnitario,
              Cantidad,
              Descuento,
              Impuesto,
              CostoTotal,
              Sistema,
              Subsistema,
              CuentaContable,
              NumeroFactura,
              Comentario,
              FechaCreacion,
              IdentificacionProveedor,
              Proveedor
            )
            VALUES (
              @IdLabor,
              @NumeroOrden,
              @Nombre,
              @TipoMantenimiento,
              @CostoUnitario,
              @Cantidad,
              @Descuento,
              @Impuesto,
              @CostoTotal,
              @Sistema,
              @Subsistema,
              @CuentaContable,
              @NumeroFactura,
              @Comentario,
              @FechaCreacion,
              @IdentificacionProveedor,
              @Proveedor
            );
          `;
          await pool
            .request()
            .input('IdLabor', mssql.Int, labor.id)
            .input('NumeroOrden', mssql.Int, order.number)
            .input('Nombre', mssql.VarChar, labor.name)
            .input('TipoMantenimiento', mssql.VarChar, labor.maintenanceType?.name || ' ')
            .input('CostoUnitario', mssql.Int, labor.unitCost || 0)
            .input('Cantidad', mssql.Numeric(18, 2), labor.qty || 0)
            .input('Descuento', mssql.Int, labor.discount || 0)
            .input('Impuesto', mssql.Int, labor.tax || 0)
            .input('CostoTotal', mssql.Int, labor.totalCost || 0)
            .input('Sistema', mssql.VarChar, labor.system?.name || ' ')
            .input('Subsistema', mssql.VarChar, labor.subsystem?.name || ' ')
            .input('CuentaContable', mssql.VarChar, labor.ledgerAccount || ' ')
            .input('NumeroFactura', mssql.VarChar, labor.invoice?.number || ' ')
            .input('Comentario', mssql.VarChar, labor.comment || ' ')
            .input('FechaCreacion', mssql.DateTime, labor.createdAt)
            .input('IdentificacionProveedor', mssql.VarChar, labor.vendor?.identification || ' ')
            .input('Proveedor', mssql.VarChar, labor.vendor?.name || ' ')
            .query(insertLaborQuery);
        }
      }

      // Insertar partes
      if (order.parts && order.parts.length > 0) {
        for (const part of order.parts) {
          const insertPartQuery = `
            INSERT INTO Dev_CD_Partes (
              IdParte,
              NumeroOrden,
              Nombre,
              Codigo,
              CostoUnitario,
              Cantidad,
              Descuento,
              Impuesto,
              CostoTotal,
              Proveedor,
              CuentaContable,
              NumeroFactura,
              FechaFactura,
              FechaPresentacion,
              Comentario,
              FechaCreacion
            )
            VALUES (
              @IdParte,
              @NumeroOrden,
              @Nombre,
              @Codigo,
              @CostoUnitario,
              @Cantidad,
              @Descuento,
              @Impuesto,
              @CostoTotal,
              @Proveedor,
              @CuentaContable,
              @NumeroFactura,
              @FechaFactura,
              @FechaPresentacion,
              @Comentario,
              @FechaCreacion
            );
          `;
          await pool
            .request()
            .input('IdParte', mssql.Int, part.id)
            .input('NumeroOrden', mssql.Int, order.number)
            .input('Nombre', mssql.VarChar, part.name)
            .input('Codigo', mssql.VarChar, part.code)
            .input('CostoUnitario', mssql.Int, part.unitCost || 0)
            .input('Cantidad', mssql.Int, part.qty || 0)
            .input('Descuento', mssql.Int, part.discount || 0)
            .input('Impuesto', mssql.Int, part.tax || 0)
            .input('CostoTotal', mssql.Int, part.totalCost || 0)
            .input('Proveedor', mssql.VarChar, part.vendor?.name || ' ')
            .input('CuentaContable', mssql.VarChar, part.ledgerAccount || ' ')
            .input('NumeroFactura', mssql.VarChar, part.invoiceNumber || ' ')
            .input('FechaFactura', mssql.VarChar, part.invoice?.date || null)
            .input('FechaPresentacion', mssql.VarChar, part.invoice?.filingDate || null)
            .input('Comentario', mssql.VarChar, part.comment || ' ')
            .input('FechaCreacion', mssql.DateTime, part.createdAt)
            .query(insertPartQuery);
        }
      }

      // Si es nueva, incrementamos el contador
      stats.newOrders++;
      /* console.log(`Orden ${order.number} insertada correctamente.`); */
    }

  } catch (error) {
    console.error(`Error al procesar la orden ${order.number}:`, error);
  }
};

module.exports = {
  insertOrder
};