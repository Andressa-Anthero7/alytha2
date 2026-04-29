import { AlertCircle, ChevronDown, ChevronUp, Eye, EyeOff, LoaderCircle, MapPin, Search, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { OfferShareButton } from '../components/OfferShareButton';
import { apiFetch } from '../lib/api';
import { useDocumentMetadata } from '../shared/metadata';
import { buildMarketplaceDocumentMetadata } from '../shared/share';
import type { PublicMarketplaceOfferListItem, PublicMarketplaceOffersListPayload } from '../types';

const formatCurrency = (value: number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQuantity = (value: number, unit: string) => `${Number(value).toLocaleString('pt-BR')} ${unit}`;

const formatDate = (value: string) =>
  new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const typeLabel = {
  venda: 'Oferta de venda',
  compra: 'Demanda de compra',
} as const;

const channelLabel = {
  mesa: 'Operando com a mesa',
  direta: 'Oferta direta',
} as const;

type MapCoordinate = {
  lat: number;
  lng: number;
  precision: 'city' | 'state' | 'fallback';
};

type MarketplaceMapPoint = MapCoordinate & {
  key: string;
  location: string;
  offers: PublicMarketplaceOfferListItem[];
  sellCount: number;
  buyCount: number;
  grains: string[];
  totalQuantity: number;
  averagePrice: number;
};

const stateCoordinates: Record<string, { lat: number; lng: number }> = {
  AC: { lat: -8.77, lng: -70.55 },
  AL: { lat: -9.62, lng: -36.82 },
  AM: { lat: -3.47, lng: -65.1 },
  AP: { lat: 1.41, lng: -51.77 },
  BA: { lat: -12.58, lng: -41.7 },
  CE: { lat: -5.2, lng: -39.53 },
  DF: { lat: -15.79, lng: -47.88 },
  ES: { lat: -19.19, lng: -40.34 },
  GO: { lat: -16.64, lng: -49.31 },
  MA: { lat: -5.42, lng: -45.44 },
  MG: { lat: -18.1, lng: -44.38 },
  MS: { lat: -20.51, lng: -54.54 },
  MT: { lat: -12.64, lng: -55.42 },
  PA: { lat: -5.53, lng: -52.29 },
  PB: { lat: -7.28, lng: -36.72 },
  PE: { lat: -8.38, lng: -37.86 },
  PI: { lat: -7.71, lng: -42.73 },
  PR: { lat: -24.89, lng: -51.55 },
  RJ: { lat: -22.25, lng: -42.66 },
  RN: { lat: -5.81, lng: -36.59 },
  RO: { lat: -10.83, lng: -63.34 },
  RR: { lat: 2.05, lng: -61.39 },
  RS: { lat: -30.17, lng: -53.5 },
  SC: { lat: -27.33, lng: -49.44 },
  SE: { lat: -10.57, lng: -37.45 },
  SP: { lat: -22.19, lng: -48.79 },
  TO: { lat: -10.25, lng: -48.25 },
};

const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  barreiras: { lat: -12.15, lng: -44.99 },
  cascavel: { lat: -24.96, lng: -53.46 },
  dourados: { lat: -22.22, lng: -54.81 },
  goiania: { lat: -16.69, lng: -49.26 },
  luis_eduardo_magalhaes: { lat: -12.1, lng: -45.79 },
  lucas_do_rio_verde: { lat: -13.06, lng: -55.91 },
  maringa: { lat: -23.42, lng: -51.93 },
  paranagua: { lat: -25.52, lng: -48.52 },
  ponta_grossa: { lat: -25.09, lng: -50.16 },
  rio_verde: { lat: -17.79, lng: -50.92 },
  rondonopolis: { lat: -16.47, lng: -54.64 },
  sinop: { lat: -11.86, lng: -55.51 },
  sorriso: { lat: -12.54, lng: -55.72 },
  uberlandia: { lat: -18.91, lng: -48.28 },
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
const configuredGoogleMapsMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim();
const googleMapsMapId = configuredGoogleMapsMapId && configuredGoogleMapsMapId !== 'seu-map-id' ? configuredGoogleMapsMapId : 'DEMO_MAP_ID';
const brazilMarketCenter = { lat: -15.78, lng: -52.0 };
const brazilMapBounds = {
  north: 6.2,
  south: -34.2,
  west: -74.0,
  east: -34.0,
};

const normalizeLocationText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const clampLatitude = (value: number) => Math.min(brazilMapBounds.north, Math.max(brazilMapBounds.south, value));
const clampLongitude = (value: number) => Math.min(brazilMapBounds.east, Math.max(brazilMapBounds.west, value));

const getLocationHash = (value: string) =>
  normalizeLocationText(value)
    .split('')
    .reduce((hash, char) => hash + char.charCodeAt(0), 0);

const extractStateCode = (location: string) => {
  const matches = location.toUpperCase().match(/[A-Z]{2}/g) ?? [];
  return [...matches].reverse().find((code) => Boolean(stateCoordinates[code])) || null;
};

const resolveLocationCoordinate = (location: string): MapCoordinate => {
  const cityKey = normalizeLocationText(location.split(/\s[-/,]\s|\s-\s|,/)[0] || location);
  const cityCoordinate = cityCoordinates[cityKey];
  if (cityCoordinate) {
    return { ...cityCoordinate, precision: 'city' };
  }

  const stateCode = extractStateCode(location);
  const stateCoordinate = stateCode ? stateCoordinates[stateCode] : null;
  if (stateCoordinate) {
    const hash = getLocationHash(location);
    const latOffset = ((hash % 7) - 3) * 0.12;
    const lngOffset = (((hash / 7) % 7) - 3) * 0.12;
    return {
      lat: clampLatitude(stateCoordinate.lat + latOffset),
      lng: clampLongitude(stateCoordinate.lng + lngOffset),
      precision: 'state',
    };
  }

  return { ...brazilMarketCenter, precision: 'fallback' };
};

const buildMarketplaceMapPoints = (offers: PublicMarketplaceOfferListItem[]) => {
  const groupedPoints = new Map<string, MarketplaceMapPoint>();

  offers.forEach((offer) => {
    const key = normalizeLocationText(offer.location) || String(offer.id);
    const currentPoint = groupedPoints.get(key);

    if (currentPoint) {
      currentPoint.offers.push(offer);
      return;
    }

    groupedPoints.set(key, {
      key,
      location: offer.location,
      offers: [offer],
      sellCount: 0,
      buyCount: 0,
      grains: [],
      totalQuantity: 0,
      averagePrice: 0,
      ...resolveLocationCoordinate(offer.location),
    });
  });

  return Array.from(groupedPoints.values())
    .map((point) => {
      const sellCount = point.offers.filter((offer) => offer.type === 'venda').length;
      const buyCount = point.offers.length - sellCount;
      const grains = Array.from(new Set(point.offers.map((offer) => offer.grain)));
      const totalQuantity = point.offers.reduce((total, offer) => total + Number(offer.quantity), 0);
      const averagePrice =
        point.offers.reduce((total, offer) => total + Number(offer.price), 0) / Math.max(point.offers.length, 1);

      return {
        ...point,
        sellCount,
        buyCount,
        grains,
        totalQuantity,
        averagePrice,
      };
    })
    .sort((firstPoint, secondPoint) => secondPoint.offers.length - firstPoint.offers.length || firstPoint.location.localeCompare(secondPoint.location));
};

const getMarkerTone = (point: MarketplaceMapPoint) => {
  if (point.sellCount > 0 && point.buyCount > 0) {
    return {
      halo: 'bg-slate-900/12',
      marker: 'border-slate-950 bg-slate-950 text-white shadow-slate-950/25',
      label: 'text-slate-700',
    };
  }
  if (point.sellCount > 0) {
    return {
      halo: 'bg-emerald-500/16',
      marker: 'border-emerald-700 bg-emerald-600 text-white shadow-emerald-700/25',
      label: 'text-emerald-800',
    };
  }
  return {
    halo: 'bg-amber-500/18',
    marker: 'border-amber-700 bg-amber-500 text-white shadow-amber-700/25',
    label: 'text-amber-800',
  };
};

type GoogleMapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => Record<string, unknown>;
    LatLngBounds: new () => {
      extend: (position: { lat: number; lng: number }) => void;
    };
    marker?: {
      AdvancedMarkerElement: new (options: Record<string, unknown>) => {
        map: Record<string, unknown> | null;
        addListener?: (eventName: string, handler: () => void) => void;
      };
    };
  };
};

type GoogleMapsWindow = Window & {
  google?: GoogleMapsApi;
  alythaGoogleMapsLoaded?: () => void;
};

let googleMapsLoadPromise: Promise<GoogleMapsApi> | null = null;

const loadGoogleMapsApi = (apiKey: string) => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps so pode ser carregado no navegador.'));
  }

  const mapsWindow = window as GoogleMapsWindow;
  if (mapsWindow.google?.maps?.Map) {
    return Promise.resolve(mapsWindow.google);
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-alytha-google-maps="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (mapsWindow.google?.maps?.Map) {
          resolve(mapsWindow.google);
        } else {
          reject(new Error('Google Maps carregou sem a API de mapas.'));
        }
      });
      existingScript.addEventListener('error', () => reject(new Error('Nao foi possivel carregar o Google Maps.')));
      return;
    }

    mapsWindow.alythaGoogleMapsLoaded = () => {
      if (mapsWindow.google?.maps?.Map) {
        resolve(mapsWindow.google);
      } else {
        reject(new Error('Google Maps carregou sem a API de mapas.'));
      }
      delete mapsWindow.alythaGoogleMapsLoaded;
    };

    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      loading: 'async',
      libraries: 'marker',
      language: 'pt-BR',
      region: 'BR',
      callback: 'alythaGoogleMapsLoaded',
      auth_referrer_policy: 'origin',
    });
    if (googleMapsMapId) {
      params.set('map_ids', googleMapsMapId);
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.alythaGoogleMaps = 'true';
    script.onerror = () => {
      delete mapsWindow.alythaGoogleMapsLoaded;
      reject(new Error('Nao foi possivel carregar o Google Maps.'));
    };
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

const createMapMarkerContent = (point: MarketplaceMapPoint, selected: boolean) => {
  const tone = getMarkerTone(point);
  const markerSize = Math.min(40, 26 + point.offers.length * 3);
  const wrapper = document.createElement('div');
  wrapper.className = `relative flex items-center justify-center ${selected ? 'scale-110' : ''}`;
  wrapper.style.width = `${markerSize + 18}px`;
  wrapper.style.height = `${markerSize + 18}px`;

  const halo = document.createElement('span');
  halo.className = `absolute inset-0 rounded-full ${tone.halo} ${selected ? 'ring-2 ring-white/90' : ''}`;

  const marker = document.createElement('span');
  marker.className = `relative inline-flex items-center justify-center rounded-full border-2 text-[11px] font-black shadow-xl ${tone.marker}`;
  marker.style.width = `${markerSize}px`;
  marker.style.height = `${markerSize}px`;
  marker.textContent = String(point.offers.length);

  wrapper.append(halo, marker);
  return wrapper;
};

function OfferCard({ offer }: JSX.IntrinsicAttributes & { offer: PublicMarketplaceOfferListItem }) {
  const tone = offer.type === 'venda' ? 'emerald' : 'amber';
  const badgeTone =
    tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900';
  const actionTone = tone === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700';

  return (
    <article className="rounded-[1.6rem] border border-white/80 bg-white/92 p-4 shadow-[0_35px_90px_-70px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${badgeTone}`}>
            {typeLabel[offer.type]}
          </span>
          <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{offer.grain}</h3>
        </div>
        <p className="text-right text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-xs">{formatDate(offer.createdAt)}</p>
      </div>

      <div className="mt-4 grid gap-2.5 text-[13px] text-slate-600 sm:text-sm">
        <div className="flex items-center justify-between gap-4">
          <span>Localidade</span>
          <span className="font-bold text-slate-900">{offer.location}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Quantidade</span>
          <span className="font-bold text-slate-900">{formatQuantity(offer.quantity, offer.unit)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Valor</span>
          <span className="font-bold text-slate-900">{formatCurrency(offer.price)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Safra</span>
          <span className="font-bold text-slate-900">{offer.crop}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Pagamento</span>
          <span className="font-bold text-slate-900">{offer.paymentTerms}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
          {channelLabel[offer.negotiationChannel]} • {offer.shipping}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OfferShareButton offer={offer} />
          <Link
            to={`/oportunidades/${offer.id}`}
            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white ${actionTone}`}
          >
            Acessar
          </Link>
        </div>
      </div>
    </article>
  );
}

function MarketplaceMap({ offers, totalCount }: { offers: PublicMarketplaceOfferListItem[]; totalCount: number }) {
  const points = useMemo(() => buildMarketplaceMapPoints(offers), [offers]);
  const [selectedPointKey, setSelectedPointKey] = useState('');
  const selectedPoint = points.find((point) => point.key === selectedPointKey) || points[0] || null;
  const sellTotal = offers.filter((offer) => offer.type === 'venda').length;
  const buyTotal = offers.length - sellTotal;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapStatus, setMapStatus] = useState<'missing-key' | 'loading' | 'ready' | 'error'>(
    googleMapsApiKey ? 'loading' : 'missing-key',
  );
  const [mapError, setMapError] = useState('');
  const pointsBoundsKey = useMemo(
    () => points.map((point) => `${point.key}:${point.lat}:${point.lng}:${point.offers.length}`).join('|'),
    [points],
  );

  useEffect(() => {
    if (!points.length) {
      setSelectedPointKey('');
      return;
    }

    if (!selectedPointKey || !points.some((point) => point.key === selectedPointKey)) {
      setSelectedPointKey(points[0].key);
    }
  }, [points, selectedPointKey]);

  useEffect(() => {
    if (!googleMapsApiKey) {
      setMapStatus('missing-key');
      return;
    }

    if (!mapContainerRef.current) {
      return;
    }

    let cancelled = false;
    setMapStatus('loading');
    setMapError('');

    loadGoogleMapsApi(googleMapsApiKey)
      .then((google) => {
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        if (!mapRef.current) {
          mapRef.current = new google.maps.Map(mapContainerRef.current, {
            center: brazilMarketCenter,
            zoom: 4,
            minZoom: 4,
            maxZoom: 12,
            mapId: googleMapsMapId,
            clickableIcons: false,
            fullscreenControl: false,
            mapTypeControl: false,
            restriction: {
              latLngBounds: brazilMapBounds,
              strictBounds: false,
            },
            rotateControl: false,
            scaleControl: true,
            streetViewControl: false,
            zoomControl: true,
          });
        }

        setMapStatus('ready');
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setMapStatus('error');
          setMapError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current) {
      return;
    }

    const mapsWindow = window as GoogleMapsWindow;
    const AdvancedMarkerElement = mapsWindow.google?.maps.marker?.AdvancedMarkerElement;
    if (!AdvancedMarkerElement) {
      setMapStatus('error');
      setMapError('A biblioteca de marcadores do Google Maps nao foi carregada.');
      return;
    }

    markersRef.current.forEach((marker) => {
      marker.map = null;
    });

    markersRef.current = points.map((point) => {
      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: point.lat, lng: point.lng },
        title: `${point.location}: ${point.offers.length} oportunidade(s)`,
        content: createMapMarkerContent(point, selectedPoint?.key === point.key),
      });

      marker.addListener?.('click', () => setSelectedPointKey(point.key));
      return marker;
    });

    return () => {
      markersRef.current.forEach((marker) => {
        marker.map = null;
      });
      markersRef.current = [];
    };
  }, [mapStatus, points, selectedPoint?.key]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current || !points.length) {
      return;
    }

    const mapsWindow = window as GoogleMapsWindow;
    const bounds = new mapsWindow.google!.maps.LatLngBounds();
    points.forEach((point) => bounds.extend({ lat: point.lat, lng: point.lng }));

    if (points.length === 1) {
      mapRef.current.setCenter({ lat: points[0].lat, lng: points[0].lng });
      mapRef.current.setZoom(6);
      return;
    }

    mapRef.current.fitBounds(bounds, { top: 86, right: 54, bottom: 74, left: 54 });
  }, [mapStatus, pointsBoundsKey, points]);

  useEffect(() => {
    if (mapStatus !== 'ready' || !mapRef.current || !selectedPoint) {
      return;
    }

    mapRef.current.panTo({ lat: selectedPoint.lat, lng: selectedPoint.lng });
  }, [mapStatus, selectedPoint]);

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
      <div className="relative min-h-[430px] overflow-hidden rounded-[1.4rem] border border-slate-200 bg-slate-100 shadow-[0_35px_90px_-72px_rgba(15,23,42,0.52)] sm:min-h-[520px]">
        <div ref={mapContainerRef} className="absolute inset-0 bg-slate-100" aria-label="Mapa do Google com oportunidades por praca" />

        {mapStatus !== 'ready' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(236,253,245,0.94))] px-6 text-center">
            <div className="w-full max-w-xs rounded-[1.2rem] border border-slate-200 bg-white/92 p-5 shadow-xl shadow-slate-200/60 sm:max-w-sm">
              <MapPin className="mx-auto h-8 w-8 text-emerald-700" />
              <p className="mt-3 text-sm font-black text-slate-950">
                {mapStatus === 'missing-key' ? 'Configure a chave do Google Maps' : mapStatus === 'loading' ? 'Carregando Google Maps...' : 'Mapa indisponivel'}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {mapStatus === 'missing-key'
                  ? 'Defina a chave do Google Maps no ambiente para exibir o mapa real.'
                  : mapError || 'Nao foi possivel carregar a API de mapas agora.'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 shadow-sm backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-emerald-700" />
            Mapa de oportunidades
          </span>
          <span className="rounded-full border border-slate-200 bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
            {points.length} praca(s)
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-emerald-100 bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-800 shadow-sm backdrop-blur">
            {sellTotal} venda(s)
          </span>
          <span className="rounded-full border border-amber-100 bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-800 shadow-sm backdrop-blur">
            {buyTotal} compra(s)
          </span>
          <span className="rounded-full border border-slate-200 bg-white/92 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm backdrop-blur">
            {offers.length}/{totalCount}
            <span className="hidden sm:inline"> carregada(s)</span>
          </span>
        </div>
      </div>

      <aside className="rounded-[1.4rem] border border-slate-200 bg-white/94 p-4 shadow-[0_35px_90px_-72px_rgba(15,23,42,0.45)]">
        {selectedPoint ? (
          <div className="flex h-full flex-col">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Praca selecionada</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{selectedPoint.location}</h2>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-[1.1rem] border border-emerald-100 bg-emerald-50 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Vendas</p>
                  <p className="mt-1 text-2xl font-black text-emerald-950">{selectedPoint.sellCount}</p>
                </div>
                <div className="rounded-[1.1rem] border border-amber-100 bg-amber-50 px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">Compras</p>
                  <p className="mt-1 text-2xl font-black text-amber-950">{selectedPoint.buyCount}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <span>Graos</span>
                  <span className="text-right font-bold text-slate-950">{selectedPoint.grains.join(', ')}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Volume total</span>
                  <span className="text-right font-bold text-slate-950">{formatQuantity(selectedPoint.totalQuantity, 'Sacas')}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Preco medio</span>
                  <span className="text-right font-bold text-slate-950">{formatCurrency(selectedPoint.averagePrice)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex-1 space-y-2">
              {selectedPoint.offers.slice(0, 4).map((offer) => {
                const tone = offer.type === 'venda' ? 'border-emerald-100 bg-emerald-50 text-emerald-900' : 'border-amber-100 bg-amber-50 text-amber-950';
                return (
                  <Link
                    key={offer.id}
                    to={`/oportunidades/${offer.id}`}
                    className={`block rounded-[1.1rem] border px-3 py-3 transition-colors hover:border-slate-300 ${tone}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">{typeLabel[offer.type]}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.16em]">{offer.shipping}</span>
                    </div>
                    <p className="mt-2 text-sm font-black text-slate-950">{offer.grain}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                      {formatQuantity(offer.quantity, offer.unit)} - {formatCurrency(offer.price)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </aside>
    </section>
  );
}

export default function HomePage() {
  const marketplaceMetadata = useMemo(() => buildMarketplaceDocumentMetadata(), []);
  const [payload, setPayload] = useState<PublicMarketplaceOffersListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [mapVisible, setMapVisible] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [grainFilter, setGrainFilter] = useState<'todas' | 'Soja' | 'Milho' | 'Sorgo'>('todas');
  const [typeFilter, setTypeFilter] = useState<'todas' | 'venda' | 'compra'>('todas');
  const [channelFilter, setChannelFilter] = useState<'todas' | 'mesa' | 'direta'>('todas');
  const [shippingFilter, setShippingFilter] = useState<'todas' | 'FOB' | 'CIF'>('todas');

  useDocumentMetadata(marketplaceMetadata);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(query.trim())
      || grainFilter !== 'todas'
      || typeFilter !== 'todas'
      || channelFilter !== 'todas'
      || shippingFilter !== 'todas',
    [channelFilter, grainFilter, query, shippingFilter, typeFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const loadOffers = async () => {
        setLoading(true);
        setError('');

        const params = new URLSearchParams();
        if (query.trim()) {
          params.set('q', query.trim());
        }
        if (grainFilter !== 'todas') {
          params.set('grain', grainFilter);
        }
        if (typeFilter !== 'todas') {
          params.set('type', typeFilter);
        }
        if (channelFilter !== 'todas') {
          params.set('negotiationChannel', channelFilter);
        }
        if (shippingFilter !== 'todas') {
          params.set('shipping', shippingFilter);
        }
        params.set('limit', '100');

        try {
          const response = await apiFetch(`/public-marketplace/offers?${params.toString()}`, { signal: controller.signal });
          const data = (await response.json().catch(() => null)) as PublicMarketplaceOffersListPayload | { detail?: string } | null;

          if (!response.ok || !data || !('items' in data)) {
            throw new Error((data && 'detail' in data && data.detail) || 'Não foi possível carregar o marketplace.');
          }

          setPayload(data);
        } catch (loadError) {
          if (loadError instanceof DOMException && loadError.name === 'AbortError') {
            return;
          }
          setError(loadError instanceof Error ? loadError.message : 'Erro inesperado ao carregar o marketplace.');
        } finally {
          setLoading(false);
        }
      };

      void loadOffers();
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [channelFilter, grainFilter, query, shippingFilter, typeFilter]);

  const items = payload?.items ?? [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef6ef_0%,#ffffff_34%,#f6efe4_100%)] text-slate-900">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <section className="rounded-[1.6rem] border border-white/80 bg-white/92 p-3.5 shadow-[0_45px_120px_-80px_rgba(15,23,42,0.55)] sm:rounded-[1.9rem] sm:p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500 sm:text-[11px]">Marketplace</p>
              <h1 className="mt-1 text-[1.55rem] font-black tracking-tight text-slate-950 sm:text-[1.75rem] lg:text-[1.9rem]">Ofertas e Demandas</h1>
              <p className="mt-0.5 max-w-3xl text-[13px] leading-6 text-slate-600 sm:text-[15px] sm:leading-7">
                Busque por qualquer campo da oferta/demanda (grão, praça, safra, frete, modalidade, pagamento e outros).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((currentValue) => !currentValue)}
                aria-expanded={mobileFiltersOpen}
                aria-controls="marketplace-mobile-filters"
                className="flex w-full items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 sm:hidden"
              >
                Busca e filtros
                {mobileFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600 sm:text-xs">
                {payload?.count ?? 0} resultado(s)
              </span>
              {items.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setMapVisible((currentValue) => !currentValue)}
                  aria-pressed={!mapVisible}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 sm:text-xs"
                >
                  {mapVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {mapVisible ? 'Ocultar mapa' : 'Mostrar mapa'}
                </button>
              ) : null}
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setGrainFilter('todas');
                    setTypeFilter('todas');
                    setChannelFilter('todas');
                    setShippingFilter('todas');
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50 sm:text-xs"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>

          <div
            id="marketplace-mobile-filters"
            className={`mt-2.5 gap-2 lg:grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_0.6fr] ${mobileFiltersOpen ? 'grid' : 'hidden'} sm:grid`}
          >
            <label className="relative block">
              <span className="sr-only">Buscar</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white pl-9 pr-3.5 text-[10px] font-semibold text-slate-900 placeholder:text-slate-400 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
                placeholder="Buscar (ex: Soja, Sinop, 26, FOB, 106,00, À vista...)"
              />
            </label>

            <label className="block">
              <span className="sr-only">Grão</span>
              <select
                value={grainFilter}
                onChange={(event) => setGrainFilter(event.target.value as typeof grainFilter)}
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 text-[10px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
              >
                <option value="todas">Grão</option>
                <option value="Soja">Soja</option>
                <option value="Milho">Milho</option>
                <option value="Sorgo">Sorgo</option>
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Tipo</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 text-[10px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
              >
                <option value="todas">Todas</option>
                <option value="venda">Oferta de venda</option>
                <option value="compra">Demanda de compra</option>
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Modalidade</span>
              <select
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value as typeof channelFilter)}
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 text-[10px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
              >
                <option value="todas">Modalidade</option>
                <option value="mesa">Mesa</option>
                <option value="direta">Direta</option>
              </select>
            </label>

            <label className="block">
              <span className="sr-only">Frete</span>
              <select
                value={shippingFilter}
                onChange={(event) => setShippingFilter(event.target.value as typeof shippingFilter)}
                className="h-9 w-full rounded-[1rem] border border-slate-200 bg-white px-3.5 text-[10px] font-semibold text-slate-900 focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 sm:text-[11px]"
              >
                <option value="todas">Frete</option>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mt-4">
          {loading ? (
            <div className="flex items-center gap-3 rounded-[1.8rem] border border-white/80 bg-white/90 px-5 py-4 text-[13px] text-slate-600 shadow-sm sm:text-sm">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando oportunidades...
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-[1.8rem] border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700 shadow-sm sm:text-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-[13px] text-slate-600 sm:text-sm">
              Nenhuma oportunidade encontrada com os filtros selecionados.
            </div>
          ) : (
            <>
              {mapVisible ? <MarketplaceMap offers={items} totalCount={payload?.count ?? items.length} /> : null}

              <div className={`${mapVisible ? 'mt-5' : 'mt-0'} flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between`}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{mapVisible ? 'Lista filtrada' : 'Mapa oculto'}</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Cards de ofertas e demandas</h2>
                </div>
                <span className="inline-flex w-fit rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                  {items.length} item(s)
                </span>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mt-8 rounded-[1.8rem] border border-white/80 bg-white/70 p-5 text-[13px] text-slate-600 shadow-sm sm:rounded-[2.1rem] sm:p-6 sm:text-sm">
          <p className="font-bold text-slate-900">Dica de uso</p>
          <p className="mt-2 leading-6">
            Clique em <span className="font-bold text-slate-900">Acessar</span> para ver os detalhes da oportunidade. Os canais de contato
            ficam liberados após login ou cadastro.
          </p>
        </section>
      </main>

      <Link
        to="/app/cadastro/"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/80 bg-emerald-600 px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_20px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-md transition-transform hover:-translate-y-0.5 hover:bg-emerald-700 sm:hidden"
        aria-label="Ir para cadastro"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/16 text-white">
          <UserPlus className="h-4 w-4" />
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span>Cadastre-se</span>
        </span>
      </Link>
    </div>
  );
}
