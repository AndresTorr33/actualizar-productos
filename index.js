'use strict';

const https = require('https');
const AWS = require('aws-sdk');

exports.handler = async (event) => {
  for (const record of event.Records) {
    // Si el evento es INSERT o MODIFY, actualiza o crea el documento en Elasticsearch
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

      const producto = {
        sku: newImage.curso_id,  // SKU o identificador único del producto
        nombre: newImage.nombre,
        descripcion: newImage.descripcion,
        duracion: newImage.duracion
      };

      const data = JSON.stringify(producto);

      const options = {
        hostname: process.env.ES_HOST,  // Usa el valor de la variable de entorno `ES_HOST`
        port: process.env.ES_PORT,      // Puerto de Elasticsearch
        path: `/${process.env.ES_INDEX}/_doc/${producto.sku}`,
        method: 'PUT',  // Usamos PUT para actualizar o crear el documento
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      };

      const req = https.request(options, (res) => {
        console.log(`ElasticSearch status: ${res.statusCode}`);  // Aquí se registra el estado de la respuesta (200 es éxito)
        res.on('data', (d) => {
          process.stdout.write(d);  // Escribe la respuesta del servidor
        });
      });

      req.on('error', (e) => {
        console.error(`Error enviando a ElasticSearch: ${e.message}`);
      });

      req.write(data);
      req.end();
    }

    // Si el evento es REMOVE, elimina el producto de Elasticsearch
    else if (record.eventName === 'REMOVE') {
      const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
      const sku = oldImage.curso_id;  // SKU del producto a eliminar

      const options = {
        hostname: process.env.ES_HOST,  // IP de tu Elasticsearch (como variable de entorno)
        port: process.env.ES_PORT,      // Puerto de Elasticsearch
        path: `/${process.env.ES_INDEX}/_doc/${sku}`,
        method: 'DELETE',  // Usamos DELETE para eliminar el documento
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        console.log(`ElasticSearch DELETE status: ${res.statusCode}`);
      });

      req.on('error', (e) => {
        console.error(`Error eliminando de ElasticSearch: ${e.message}`);
      });

      req.end();
    }
  }

  return { statusCode: 200, body: 'OK' };
};
