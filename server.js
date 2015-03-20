var libvirt = require('libvirt');
//var express = require("express");
var http = require("http");

// reserveSession() => Er i Magnus' loopback
// loadSession(sessionJSON) => Skal loade image og XML over på relevant superpc

var Hypervisor = libvirt.Hypervisor;

var hypervisor = new Hypervisor('qemu+tcp:///system');
console.log(hypervisor.getLibVirtVersion());
console.log(hypervisor.getDefinedDomains());


var dom = hypervisor.lookupDomainByName("Ubuntu14");
dom.start();
