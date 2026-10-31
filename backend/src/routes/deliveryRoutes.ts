import { Router } from 'express';
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getRouteSchedules,
  upsertRouteSchedule,
  deleteRouteSchedule,
  getDeliveries,
  createDelivery,
  deleteDelivery,
  getActiveVanForSalesman,
  getDeliveryReconciliation,
} from '../controllers/deliveryController';
import { authenticate, authorize } from '../middlewares/auth';
import { Role } from '../types/enums';

const router = Router();

router.use(authenticate);

// Vehicles
router.get('/vehicles', getVehicles);
router.post('/vehicles', authorize([Role.ADMIN, Role.OPERATOR]), createVehicle);
router.put('/vehicles/:id', authorize([Role.ADMIN, Role.OPERATOR]), updateVehicle);
router.delete('/vehicles/:id', authorize([Role.ADMIN]), deleteVehicle);

// Route Schedules (Repeating Weekly Van Plans)
router.get('/route-schedules', getRouteSchedules);
router.post('/route-schedules', authorize([Role.ADMIN, Role.OPERATOR]), upsertRouteSchedule);
router.delete('/route-schedules/:id', authorize([Role.ADMIN]), deleteRouteSchedule);

// Deliveries & Van Reconciliation
router.get('/active-van', getActiveVanForSalesman);
router.get('/reconciliation/:id', getDeliveryReconciliation);
router.get('/deliveries', getDeliveries);
router.post('/deliveries', authorize([Role.ADMIN, Role.OPERATOR]), createDelivery);
router.delete('/deliveries/:id', authorize([Role.ADMIN]), deleteDelivery);

export default router;
