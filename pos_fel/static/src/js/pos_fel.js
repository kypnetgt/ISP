odoo.define('pos_fel.pos_fel', function (require) {
    "use strict";
    
    const { format } = require('web.field_utils');
    
    const Registries = require('point_of_sale.Registries');
    const OrderReceipt = require('point_of_sale.OrderReceipt');
    
    const PosFELOrderReceipt = (OrderReceipt) =>
        class extends OrderReceipt {
            constructor() {
                super(...arguments);
                this._fel = {firma_fel: '', serie_fel: '', numero_fel: '', certificador_fel: '', fecha_pedido: '', precio_total_descuento: 0};
            }
            
            get fel() {
                return this._fel;
            }
            
            async willStart() {
                const env = this.receiptEnv;
                const fel = this._fel;
                const orderlines = this._receiptEnv.orderlines;

                const [order] = await this.rpc(
                    {
                        model: 'pos.order',
                        method: 'search_read',
                        args: [[['pos_reference', '=', env.order.name]], ["firma_fel", "serie_fel", "numero_fel", "certificador_fel", "date_order"]],
                    },
                    {
                        timeout: 5000,
                        shadow: true,
                    }
                );
                if (order) {
                    fel.firma_fel = order.firma_fel;
                    fel.serie_fel = order.serie_fel;
                    fel.numero_fel = order.numero_fel;
                    fel.certificador_fel = order.certificador_fel;
                    fel.fecha_pedido = format.datetime(moment(order.date_order), {}, {timezone: true});
    
                    let precio_total_descuento = 0;
                    let precio_total_positivo = 0;
    
                    orderlines.forEach(function(linea) {
                        if (linea.price * linea.quantity > 0) {
                            precio_total_positivo += linea.price * linea.quantity;
                        } else if (linea.price * linea.quantity < 0) {
                            precio_total_descuento += Math.abs(linea.price * linea.quantity);
                        }
                    });

                    fel.precio_total_descuento = precio_total_descuento;
                    
                    let descuento_porcentaje_fel = precio_total_descuento / precio_total_positivo;
                    orderlines.forEach(function(linea) {
                        if (linea.price * linea.quantity > 0) {
                            linea.descuento_porcentaje_fel = descuento_porcentaje_fel * 100;
                            linea.descuento_nominal_fel = linea.price * linea.quantity * descuento_porcentaje_fel;
                        } else if (linea.price * linea.quantity < 0) {
                            linea.descuento_porcentaje_fel = 100;
                            linea.descuento_nominal_fel = linea.price * linea.quantity;
                        }
                    });
                }
            }
        };
        
    Registries.Component.extend(OrderReceipt, PosFELOrderReceipt);

});
