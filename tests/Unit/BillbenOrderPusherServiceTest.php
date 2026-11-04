<?php

use App\Services\BillbenOrderPusherService;

dataset('Billben package mappings', [
    ['mtn', '1GB', 1],
    ['mtn', '2GB', 2],
    ['mtn', '3GB', 3],
    ['mtn', '4GB', 4],
    ['mtn', '5GB', 5],
    ['mtn', '6GB', 6],
    ['mtn', '7GB', 7],
    ['mtn', '8GB', 8],
    ['mtn', '10GB', 9],
    ['mtn', '15GB', 10],
    ['mtn', '20GB', 11],
    ['mtn', '25GB', 12],
    ['mtn', '30GB', 13],
    ['mtn', '40GB', 14],
    ['mtn', '50GB', 15],
    ['mtn', '100GB', 16],
    ['airteltigo_ishare', '1GB', 36],
    ['airteltigo_ishare', '2GB', 37],
    ['airteltigo_ishare', '3GB', 38],
    ['airteltigo_ishare', '4GB', 39],
    ['airteltigo_ishare', '5GB', 40],
    ['airteltigo_ishare', '6GB', 41],
    ['airteltigo_ishare', '7GB', 42],
    ['airteltigo_ishare', '8GB', 43],
    ['airteltigo_bigtime', '10GB', 25],
    ['airteltigo_bigtime', '15GB', 26],
    ['airteltigo_bigtime', '20GB', 27],
    ['airteltigo_bigtime', '25GB', 28],
    ['airteltigo_bigtime', '30GB', 29],
    ['airteltigo_bigtime', '40GB', 30],
    ['airteltigo_bigtime', '50GB', 31],
    ['airteltigo_bigtime', '60GB', 32],
    ['airteltigo_bigtime', '80GB', 33],
    ['airteltigo_bigtime', '100GB', 34],
    ['airteltigo_bigtime', '200GB', 35],
    ['telecel', '5GB', 17],
    ['telecel', '10GB', 18],
    ['telecel', '15GB', 19],
    ['telecel', '20GB', 20],
    ['telecel', '25GB', 21],
    ['telecel', '30GB', 22],
    ['telecel', '40GB', 23],
    ['telecel', '50GB', 24],
]);

it('maps each network and size to the matching Billben package ID', function (
    string $network,
    string $size,
    int $packageId
) {
    $method = new ReflectionMethod(BillbenOrderPusherService::class, 'getPackageIdByNetworkAndSize');
    $service = (new ReflectionClass(BillbenOrderPusherService::class))->newInstanceWithoutConstructor();

    expect($method->invoke($service, $network, $size))->toBe($packageId);
})->with('Billben package mappings');

it('accepts package sizes with decimal notation', function () {
    $method = new ReflectionMethod(BillbenOrderPusherService::class, 'getPackageIdByNetworkAndSize');
    $service = (new ReflectionClass(BillbenOrderPusherService::class))->newInstanceWithoutConstructor();

    expect($method->invoke($service, 'mtn', '10.0'))->toBe(9)
        ->and($method->invoke($service, 'mtn', '10.0 GB'))->toBe(9);
});

it('does not map unavailable package sizes', function () {
    $method = new ReflectionMethod(BillbenOrderPusherService::class, 'getPackageIdByNetworkAndSize');
    $service = (new ReflectionClass(BillbenOrderPusherService::class))->newInstanceWithoutConstructor();

    expect($method->invoke($service, 'mtn', '9GB'))->toBeNull()
        ->and($method->invoke($service, 'unknown', '10GB'))->toBeNull();
});
